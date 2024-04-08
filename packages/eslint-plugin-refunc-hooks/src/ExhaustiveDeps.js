/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// eslint-disable-next-line strict
'use strict';

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'verifies the list of dependencies for Hooks like hookMemo and similar',
      recommended: true,
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        enableDangerousAutofixThisMayCauseInfiniteLoops: false,
        properties: {
          additionalHooks: {
            type: 'string',
          },
          enableDangerousAutofixThisMayCauseInfiniteLoops: {
            type: 'boolean',
          },
        },
      },
    ],
  },
  create(context) {
    // Parse the `additionalHooks` regex.
    const additionalHooks =
      context.options &&
      context.options[0] &&
      context.options[0].additionalHooks
        ? new RegExp(context.options[0].additionalHooks)
        : undefined;

    const enableDangerousAutofixThisMayCauseInfiniteLoops =
      (context.options &&
        context.options[0] &&
        context.options[0].enableDangerousAutofixThisMayCauseInfiniteLoops) ||
      false;

    const options = {
      additionalHooks,
      enableDangerousAutofixThisMayCauseInfiniteLoops,
    };

    function reportProblem(problem) {
      if (enableDangerousAutofixThisMayCauseInfiniteLoops) {
        // Used to enable legacy behavior. Dangerous.
        // Keep this as an option until major IDEs upgrade (including VSCode FB ESLint extension).
        if (Array.isArray(problem.suggest) && problem.suggest.length > 0) {
          problem.fix = problem.suggest[0].fix;
        }
      }
      context.report(problem);
    }

    const scopeManager = context.getSourceCode().scopeManager;

    // Should be shared between visitors.
    const stableKnownValueCache = new WeakMap();
    const functionWithoutCapturedValueCache = new WeakMap();
    function memoizeWithWeakMap(fn, map) {
      return function (arg) {
        if (map.has(arg)) {
          // to verify cache hits:
          // console.log(arg.name)
          return map.get(arg);
        }
        const result = fn(arg);
        map.set(arg, result);
        return result;
      };
    }
    /**
     * Visitor for both function expressions and arrow function expressions.
     */
    function visitFunctionWithDependencies(
      node,
      declaredDependenciesNode,
      reactiveHook,
      reactiveHookName,
    ) {
      // Get the current scope.
      const scope = scopeManager.acquire(node);

      // Find all our "pure scopes". On every re-render of a component these
      // pure scopes may have changes to the variables declared within. So all
      // variables used in our reactive hook callback but declared in a pure
      // scope need to be listed as dependencies of our reactive hook callback.
      //
      // According to the rules of React you can't read a mutable value in pure
      // scope. We can't enforce this in a lint so we trust that all variables
      // declared outside of pure scope are indeed frozen.

      /*
      Engraft thoughts: Hooks are usually found in hooks(() => {...}).
      Occasionally they are found in function hookSomethingCool() {...} (a new
      higher-level hook). In either case, they can be nested in layers of
      scopes.

      So I think we want to get rid of the distinction between pureScopes and
      componentScope, and have pureScopes include all the fun intermediate
      levels.

      We can identify the "top" level (the stopping level) either by just going
      until we hit a module scope (simple but dangerous if someone decides to
      put hooks / hookSomethingCool inside of more complex constructions) or by
      looking for hooks / hookSomethingCool.

      Let's figure out what the system actually does with pureScopes &
      componentScope.

      */

      const pureScopes = new Set();
      let componentScope = null;
      {
        let currentScope = scope.upper;
        while (currentScope) {
          pureScopes.add(currentScope);
          const blockParent = currentScope.block.parent;
          if (blockParent && blockParent.type === 'CallExpression' && blockParent.callee.name === 'hooks') {
            // body of a hooks() call; done climbing
            break;
          }
          if (currentScope.block.type === 'FunctionDeclaration' && currentScope.block.id.name.match('^hook[A-Z]')) {
            // declaring a new hook; done climbing
            break;
          }
          currentScope = currentScope.upper;
        }
        if (!currentScope) {
          reportProblem({
            node,
            message: `Refunc Hook ${context.getSource(reactiveHook)} used outside of 'hooks' or hook definition.`,
          });
          return;
        }
        componentScope = currentScope;
      }

      const isArray = Array.isArray;

      // Next we'll define a few helpers that helps us
      // tell if some values don't have to be declared as deps.

      function isStableKnownHookValue(resolved) {
        if (!isArray(resolved.defs)) {
          return false;
        }
        const def = resolved.defs[0];
        if (def == null) {
          return false;
        }
        // Look for `let stuff = ...`
        if (def.node.type !== 'VariableDeclarator') {
          return false;
        }
        let init = def.node.init;
        if (init == null) {
          return false;
        }
        while (init.type === 'TSAsExpression') {
          init = init.expression;
        }
        // Detect primitive constants
        // const foo = 42
        let declaration = def.node.parent;
        if (declaration == null) {
          // This might happen if variable is declared after the callback.
          // In that case ESLint won't set up .parent refs.
          // So we'll set them up manually.
          fastFindReferenceWithParent(componentScope.block, def.node.id);
          declaration = def.node.parent;
          if (declaration == null) {
            return false;
          }
        }
        if (
          declaration.kind === 'const' &&
          init.type === 'Literal' &&
          (typeof init.value === 'string' ||
            typeof init.value === 'number' ||
            init.value === null)
        ) {
          // Definitely stable
          return true;
        }
        // By default assume it's dynamic.
        return false;
      }

      // Some are just functions that don't reference anything dynamic.
      function isFunctionWithoutCapturedValues(resolved) {
        if (!isArray(resolved.defs)) {
          return false;
        }
        const def = resolved.defs[0];
        if (def == null) {
          return false;
        }
        if (def.node == null || def.node.id == null) {
          return false;
        }
        // Search the direct component subscopes for
        // top-level function definitions matching this reference.
        const fnNode = def.node;
        const childScopes = componentScope.childScopes;
        let fnScope = null;
        let i;
        for (i = 0; i < childScopes.length; i++) {
          const childScope = childScopes[i];
          const childScopeBlock = childScope.block;
          if (
            // function handleChange() {}
            (fnNode.type === 'FunctionDeclaration' &&
              childScopeBlock === fnNode) ||
            // const handleChange = () => {}
            // const handleChange = function() {}
            (fnNode.type === 'VariableDeclarator' &&
              childScopeBlock.parent === fnNode)
          ) {
            // Found it!
            fnScope = childScope;
            break;
          }
        }
        if (fnScope == null) {
          return false;
        }
        // Does this function capture any values
        // that are in pure scopes (aka render)?
        for (i = 0; i < fnScope.through.length; i++) {
          const ref = fnScope.through[i];
          if (ref.resolved == null) {
            continue;
          }
          if (
            pureScopes.has(ref.resolved.scope) &&
            // Stable values are fine though,
            // although we won't check functions deeper.
            !memoizedIsStableKnownHookValue(ref.resolved)
          ) {
            return false;
          }
        }
        // If we got here, this function doesn't capture anything
        // from render--or everything it captures is known stable.
        return true;
      }

      // Remember such values. Avoid re-running extra checks on them.
      const memoizedIsStableKnownHookValue = memoizeWithWeakMap(
        isStableKnownHookValue,
        stableKnownValueCache,
      );
      const memoizedIsFunctionWithoutCapturedValues = memoizeWithWeakMap(
        isFunctionWithoutCapturedValues,
        functionWithoutCapturedValueCache,
      );

      // Get dependencies from all our resolved references in pure scopes.
      // Key is dependency string, value is whether it's stable.
      const dependencies = new Map();
      const optionalChains = new Map();
      gatherDependenciesRecursively(scope);

      function gatherDependenciesRecursively(currentScope) {
        for (const reference of currentScope.references) {
          // If this reference is not resolved or it is not declared in a pure
          // scope then we don't care about this reference.
          if (!reference.resolved) {
            continue;
          }
          if (!pureScopes.has(reference.resolved.scope)) {
            continue;
          }

          // Narrow the scope of a dependency if it is, say, a member expression.
          // Then normalize the narrowed dependency.
          const referenceNode = fastFindReferenceWithParent(
            node,
            reference.identifier,
          );
          const dependencyNode = getDependency(referenceNode);
          const dependency = analyzePropertyChain(
            dependencyNode,
            optionalChains,
          );

          if (
            dependencyNode.parent.type === 'TSTypeQuery' ||
            dependencyNode.parent.type === 'TSTypeReference'
          ) {
            continue;
          }

          const def = reference.resolved.defs[0];
          if (def == null) {
            continue;
          }
          // Ignore references to the function itself as it's not defined yet.
          if (def.node != null && def.node.init === node.parent) {
            continue;
          }
          // Ignore Flow type parameters
          if (def.type === 'TypeParameter') {
            continue;
          }

          // Add the dependency to a map so we can make sure it is referenced
          // again in our dependencies array. Remember whether it's stable.
          if (!dependencies.has(dependency)) {
            const resolved = reference.resolved;
            const isStable =
              memoizedIsStableKnownHookValue(resolved) ||
              memoizedIsFunctionWithoutCapturedValues(resolved);
            dependencies.set(dependency, {
              isStable,
              references: [reference],
            });
          } else {
            dependencies.get(dependency).references.push(reference);
          }
        }

        for (const childScope of currentScope.childScopes) {
          gatherDependenciesRecursively(childScope);
        }
      }

      // Warn about assigning to variables in the outer scope.
      // Those are usually bugs.
      const staleAssignments = new Set();
      function reportStaleAssignment(writeExpr, key) {
        if (staleAssignments.has(key)) {
          return;
        }
        staleAssignments.add(key);
        reportProblem({
          node: writeExpr,
          message:
            `Assignments to the '${key}' variable from inside Refunc Hook ` +
            `${context.getSource(reactiveHook)} will be lost after each ` +
            `render. To preserve the value over time, store it in a useRef ` +
            `Hook and keep the mutable value in the '.current' property. ` +
            `Otherwise, you can move this variable directly inside ` +
            `${context.getSource(reactiveHook)}.`,
        });
      }

      // Remember which deps are stable and report bad usage first.
      const stableDependencies = new Set();
      dependencies.forEach(({isStable, references}, key) => {
        if (isStable) {
          stableDependencies.add(key);
        }
        references.forEach(reference => {
          if (reference.writeExpr) {
            reportStaleAssignment(reference.writeExpr, key);
          }
        });
      });

      if (staleAssignments.size > 0) {
        // The intent isn't clear so we'll wait until you fix those first.
        return;
      }

      const declaredDependencies = [];
      const externalDependencies = new Set();
      if (declaredDependenciesNode.type !== 'ArrayExpression') {
        // If the declared dependencies are not an array expression then we
        // can't verify that the user provided the correct dependencies. Tell
        // the user this in an error.
        reportProblem({
          node: declaredDependenciesNode,
          message:
            `Refunc Hook ${context.getSource(reactiveHook)} was passed a ` +
            'dependency list that is not an array literal. This means we ' +
            "can't statically verify whether you've passed the correct " +
            'dependencies.',
        });
      } else {
        declaredDependenciesNode.elements.forEach(declaredDependencyNode => {
          // Skip elided elements.
          if (declaredDependencyNode === null) {
            return;
          }
          // If we see a spread element then add a special warning.
          if (declaredDependencyNode.type === 'SpreadElement') {
            reportProblem({
              node: declaredDependencyNode,
              message:
                `Refunc Hook ${context.getSource(reactiveHook)} has a spread ` +
                "element in its dependency array. This means we can't " +
                "statically verify whether you've passed the " +
                'correct dependencies.',
            });
            return;
          }
          // Try to normalize the declared dependency. If we can't then an error
          // will be thrown. We will catch that error and report an error.
          let declaredDependency;
          try {
            declaredDependency = analyzePropertyChain(
              declaredDependencyNode,
              null,
            );
          } catch (error) {
            if (/Unsupported node type/.test(error.message)) {
              if (declaredDependencyNode.type === 'Literal') {
                if (dependencies.has(declaredDependencyNode.value)) {
                  reportProblem({
                    node: declaredDependencyNode,
                    message:
                      `The ${declaredDependencyNode.raw} literal is not a valid dependency ` +
                      `because it never changes. ` +
                      `Did you mean to include ${declaredDependencyNode.value} in the array instead?`,
                  });
                } else {
                  reportProblem({
                    node: declaredDependencyNode,
                    message:
                      `The ${declaredDependencyNode.raw} literal is not a valid dependency ` +
                      'because it never changes. You can safely remove it.',
                  });
                }
              } else {
                reportProblem({
                  node: declaredDependencyNode,
                  message:
                    `Refunc Hook ${context.getSource(reactiveHook)} has a ` +
                    `complex expression in the dependency array. ` +
                    'Extract it to a separate variable so it can be statically checked.',
                });
              }

              return;
            } else {
              throw error;
            }
          }

          let maybeID = declaredDependencyNode;
          while (
            maybeID.type === 'MemberExpression' ||
            maybeID.type === 'OptionalMemberExpression' ||
            maybeID.type === 'ChainExpression'
          ) {
            maybeID = maybeID.object || maybeID.expression.object;
          }
          const isDeclaredInComponent = !componentScope.through.some(
            ref => ref.identifier === maybeID,
          );

          // Add the dependency to our declared dependency map.
          declaredDependencies.push({
            key: declaredDependency,
            node: declaredDependencyNode,
          });

          if (!isDeclaredInComponent) {
            externalDependencies.add(declaredDependency);
          }
        });
      }

      const {
        suggestedDependencies,
        unnecessaryDependencies,
        missingDependencies,
        duplicateDependencies,
      } = collectRecommendations({
        dependencies,
        declaredDependencies,
        stableDependencies,
        externalDependencies,
      });

      let suggestedDeps = suggestedDependencies;

      const problemCount =
        duplicateDependencies.size +
        missingDependencies.size +
        unnecessaryDependencies.size;

      if (problemCount === 0) {
        // If nothing else to report, check if some dependencies would
        // invalidate on every render.
        const constructions = scanForConstructions({
          declaredDependencies,
          declaredDependenciesNode,
          componentScope,
          scope,
        });
        constructions.forEach(
          ({construction, isUsedOutsideOfHook, depType}) => {
            const wrapperHook =
              depType === 'function' ? 'useCallback' : 'hookMemo';

            const constructionType =
              depType === 'function' ? 'definition' : 'initialization';

            const defaultAdvice = `wrap the ${constructionType} of '${construction.name.name}' in its own ${wrapperHook}() Hook.`;

            const advice = isUsedOutsideOfHook
              ? `To fix this, ${defaultAdvice}`
              : `Move it inside the ${reactiveHookName} callback. Alternatively, ${defaultAdvice}`;

            const causation =
              depType === 'conditional' || depType === 'logical expression'
                ? 'could make'
                : 'makes';

            const message =
              `The '${construction.name.name}' ${depType} ${causation} the dependencies of ` +
              `${reactiveHookName} Hook (at line ${declaredDependenciesNode.loc.start.line}) ` +
              `change on every render. ${advice}`;

            let suggest;
            // Only handle the simple case of variable assignments.
            // Wrapping function declarations can mess up hoisting.
            if (
              isUsedOutsideOfHook &&
              construction.type === 'Variable' &&
              // Objects may be mutated after construction, which would make this
              // fix unsafe. Functions _probably_ won't be mutated, so we'll
              // allow this fix for them.
              depType === 'function'
            ) {
              suggest = [
                {
                  desc: `Wrap the ${constructionType} of '${construction.name.name}' in its own ${wrapperHook}() Hook.`,
                  fix(fixer) {
                    const [before, after] =
                      wrapperHook === 'hookMemo'
                        ? [`hookMemo(() => { return `, '; })']
                        : ['useCallback(', ')'];
                    return [
                      // TODO: also add an import?
                      fixer.insertTextBefore(construction.node.init, before),
                      // TODO: ideally we'd gather deps here but it would require
                      // restructuring the rule code. This will cause a new lint
                      // error to appear immediately for useCallback. Note we're
                      // not adding [] because would that changes semantics.
                      fixer.insertTextAfter(construction.node.init, after),
                    ];
                  },
                },
              ];
            }
            // TODO: What if the function needs to change on every render anyway?
            // Should we suggest removing effect deps as an appropriate fix too?
            reportProblem({
              // TODO: Why not report this at the dependency site?
              node: construction.node,
              message,
              suggest,
            });
          },
        );
        return;
      }

      // If we're going to report a missing dependency,
      // we might as well recalculate the list ignoring
      // the currently specified deps. This can result
      // in some extra deduplication. We can't do this
      // for effects though because those have legit
      // use cases for over-specifying deps.
      if (missingDependencies.size > 0) {
        suggestedDeps = collectRecommendations({
          dependencies,
          declaredDependencies: [], // Pretend we don't know
          stableDependencies,
          externalDependencies
        }).suggestedDependencies;
      }

      // Alphabetize the suggestions, but only if deps were already alphabetized.
      function areDeclaredDepsAlphabetized() {
        if (declaredDependencies.length === 0) {
          return true;
        }
        const declaredDepKeys = declaredDependencies.map(dep => dep.key);
        const sortedDeclaredDepKeys = declaredDepKeys.slice().sort();
        return declaredDepKeys.join(',') === sortedDeclaredDepKeys.join(',');
      }
      if (areDeclaredDepsAlphabetized()) {
        suggestedDeps.sort();
      }

      // Most of our algorithm deals with dependency paths with optional chaining stripped.
      // This function is the last step before printing a dependency, so now is a good time to
      // check whether any members in our path are always used as optional-only. In that case,
      // we will use ?. instead of . to concatenate those parts of the path.
      function formatDependency(path) {
        const members = path.split('.');
        let finalPath = '';
        for (let i = 0; i < members.length; i++) {
          if (i !== 0) {
            const pathSoFar = members.slice(0, i + 1).join('.');
            const isOptional = optionalChains.get(pathSoFar) === true;
            finalPath += isOptional ? '?.' : '.';
          }
          finalPath += members[i];
        }
        return finalPath;
      }

      function getWarningMessage(deps, singlePrefix, label, fixVerb) {
        if (deps.size === 0) {
          return null;
        }
        return (
          (deps.size > 1 ? '' : singlePrefix + ' ') +
          label +
          ' ' +
          (deps.size > 1 ? 'dependencies' : 'dependency') +
          ': ' +
          joinEnglish(
            Array.from(deps)
              .sort()
              .map(name => "'" + formatDependency(name) + "'"),
          ) +
          `. Either ${fixVerb} ${
            deps.size > 1 ? 'them' : 'it'
          } or remove the dependency array.`
        );
      }

      let extraWarning = '';
      if (unnecessaryDependencies.size > 0) {
        let badRef = null;
        Array.from(unnecessaryDependencies.keys()).forEach(key => {
          if (badRef !== null) {
            return;
          }
          if (key.endsWith('.current')) {
            badRef = key;
          }
        });
        if (badRef !== null) {
          extraWarning =
            ` Mutable values like '${badRef}' aren't valid dependencies ` +
            "because mutating them doesn't re-render the component.";
        } else if (externalDependencies.size > 0) {
          const dep = Array.from(externalDependencies)[0];
          // Don't show this warning for things that likely just got moved *inside* the callback
          // because in that case they're clearly not referring to globals.
          if (!scope.set.has(dep)) {
            extraWarning =
              ` Outer scope values like '${dep}' aren't valid dependencies ` +
              `because mutating them doesn't re-render the component.`;
          }
        }
      }

      // `props.foo()` marks `props` as a dependency because it has
      // a `this` value. This warning can be confusing.
      // So if we're going to show it, append a clarification.
      if (!extraWarning && missingDependencies.has('props')) {
        const propDep = dependencies.get('props');
        if (propDep == null) {
          return;
        }
        const refs = propDep.references;
        if (!Array.isArray(refs)) {
          return;
        }
        let isPropsOnlyUsedInMembers = true;
        for (let i = 0; i < refs.length; i++) {
          const ref = refs[i];
          const id = fastFindReferenceWithParent(
            componentScope.block,
            ref.identifier,
          );
          if (!id) {
            isPropsOnlyUsedInMembers = false;
            break;
          }
          const parent = id.parent;
          if (parent == null) {
            isPropsOnlyUsedInMembers = false;
            break;
          }
          if (
            parent.type !== 'MemberExpression' &&
            parent.type !== 'OptionalMemberExpression'
          ) {
            isPropsOnlyUsedInMembers = false;
            break;
          }
        }
        if (isPropsOnlyUsedInMembers) {
          extraWarning =
            ` However, 'props' will change when *any* prop changes, so the ` +
            `preferred fix is to destructure the 'props' object outside of ` +
            `the ${reactiveHookName} call and refer to those specific props ` +
            `inside ${context.getSource(reactiveHook)}.`;
        }
      }

      reportProblem({
        node: declaredDependenciesNode,
        message:
          `Refunc Hook ${context.getSource(reactiveHook)} has ` +
          // To avoid a long message, show the next actionable item.
          (getWarningMessage(missingDependencies, 'a', 'missing', 'include') ||
            getWarningMessage(
              unnecessaryDependencies,
              'an',
              'unnecessary',
              'exclude',
            ) ||
            getWarningMessage(
              duplicateDependencies,
              'a',
              'duplicate',
              'omit',
            )) +
          extraWarning,
        suggest: [
          {
            desc: `Update the dependencies array to be: [${suggestedDeps
              .map(formatDependency)
              .join(', ')}]`,
            fix(fixer) {
              // TODO: consider preserving the comments or formatting?
              return fixer.replaceText(
                declaredDependenciesNode,
                `[${suggestedDeps.map(formatDependency).join(', ')}]`,
              );
            },
          },
        ],
      });
    }

    function visitCallExpression(node) {
      const callbackIndex = getReactiveHookCallbackIndex(node.callee, options, node);
      if (callbackIndex === -1) {
        // Not a Refunc Hook call that needs deps.
        return;
      }

      const callback = node.arguments[callbackIndex];
      const reactiveHook = node.callee;
      const reactiveHookName = getNodeWithoutRefuncNamespace(reactiveHook).name;
      const declaredDependenciesNode = node.arguments[callbackIndex + 1];

      // Check whether a callback is supplied. If there is no callback supplied
      // then the hook will not work and React will throw a TypeError.
      // So no need to check for dependency inclusion.
      if (!callback) {
        reportProblem({
          node: reactiveHook,
          message:
            `Refunc Hook ${reactiveHookName} requires an effect callback. ` +
            `Did you forget to pass a callback to the hook?`,
        });
        return;
      }

      // Check the declared dependencies for this reactive hook. If there is no
      // second argument then the reactive callback will re-run on every render.
      // So no need to check for dependency inclusion.
      if (!declaredDependenciesNode) {
        // These are only used for optimization.
        if (
          reactiveHookName === 'hookMemo'
        ) {
          // TODO: Can this have a suggestion?
          reportProblem({
            node: reactiveHook,
            message:
              `Refunc Hook ${reactiveHookName} does nothing when called with ` +
              `only one argument. Did you forget to pass an array of ` +
              `dependencies?`,
          });
        }
        return;
      }

      switch (callback.type) {
        case 'FunctionExpression':
        case 'ArrowFunctionExpression':
          visitFunctionWithDependencies(
            callback,
            declaredDependenciesNode,
            reactiveHook,
            reactiveHookName,
          );
          return; // Handled
        case 'Identifier':
          if (!declaredDependenciesNode) {
            // No deps, no problems.
            return; // Handled
          }
          // The function passed as a callback is not written inline.
          // But perhaps it's in the dependencies array?
          if (
            declaredDependenciesNode.elements &&
            declaredDependenciesNode.elements.some(
              el => el && el.type === 'Identifier' && el.name === callback.name,
            )
          ) {
            // If it's already in the list of deps, we don't care because
            // this is valid regardless.
            return; // Handled
          }
          // We'll do our best effort to find it, complain otherwise.
          const variable = context.getScope().set.get(callback.name);
          if (variable == null || variable.defs == null) {
            // If it's not in scope, we don't care.
            return; // Handled
          }
          // The function passed as a callback is not written inline.
          // But it's defined somewhere in the render scope.
          // We'll do our best effort to find and check it, complain otherwise.
          const def = variable.defs[0];
          if (!def || !def.node) {
            break; // Unhandled
          }
          if (def.type !== 'Variable' && def.type !== 'FunctionName') {
            // Parameter or an unusual pattern. Bail out.
            break; // Unhandled
          }
          // eslint-disable-next-line default-case
          switch (def.node.type) {
            case 'FunctionDeclaration':
              // hookMemo(() => { ... }, []);
              visitFunctionWithDependencies(
                def.node,
                declaredDependenciesNode,
                reactiveHook,
                reactiveHookName,
              );
              return; // Handled
            case 'VariableDeclarator':
              const init = def.node.init;
              if (!init) {
                break; // Unhandled
              }
              // eslint-disable-next-line default-case
              switch (init.type) {
                // const effectBody = () => {...};
                // hookMemo(effectBody, []);
                case 'ArrowFunctionExpression':
                case 'FunctionExpression':
                  // We can inspect this function as if it were inline.
                  visitFunctionWithDependencies(
                    init,
                    declaredDependenciesNode,
                    reactiveHook,
                    reactiveHookName,
                  );
                  return; // Handled
              }
              break; // Unhandled
          }
          break; // Unhandled
        default:
          // hookMemo(generateEffectBody(), []);
          reportProblem({
            node: reactiveHook,
            message:
              `Refunc Hook ${reactiveHookName} received a function whose dependencies ` +
              `are unknown. Pass an inline function instead.`,
          });
          return; // Handled
      }

      // Something unusual. Fall back to suggesting to add the body itself as a dep.
      reportProblem({
        node: reactiveHook,
        message:
          `Refunc Hook ${reactiveHookName} has a missing dependency: '${callback.name}'. ` +
          `Either include it or remove the dependency array.`,
        suggest: [
          {
            desc: `Update the dependencies array to be: [${callback.name}]`,
            fix(fixer) {
              return fixer.replaceText(
                declaredDependenciesNode,
                `[${callback.name}]`,
              );
            },
          },
        ],
      });
    }

    return {
      CallExpression: visitCallExpression,
    };
  },
};

// JAH: done with the plugin def; pure functions follow

// The meat of the logic.
function collectRecommendations({
  dependencies,
  declaredDependencies,
  stableDependencies,
  externalDependencies,
}) {
  // Our primary data structure.
  // It is a logical representation of property chains:
  // `props` -> `props.foo` -> `props.foo.bar` -> `props.foo.bar.baz`
  //         -> `props.lol`
  //         -> `props.huh` -> `props.huh.okay`
  //         -> `props.wow`
  // We'll use it to mark nodes that are *used* by the programmer,
  // and the nodes that were *declared* as deps. Then we will
  // traverse it to learn which deps are missing or unnecessary.
  const depTree = createDepTree();
  function createDepTree() {
    return {
      isUsed: false, // True if used in code
      isSatisfiedRecursively: false, // True if specified in deps
      isSubtreeUsed: false, // True if something deeper is used by code
      children: new Map(), // Nodes for properties
    };
  }

  // Mark all required nodes first.
  // Imagine exclamation marks next to each used deep property.
  dependencies.forEach((_, key) => {
    const node = getOrCreateNodeByPath(depTree, key);
    node.isUsed = true;
    markAllParentsByPath(depTree, key, parent => {
      parent.isSubtreeUsed = true;
    });
  });

  // Mark all satisfied nodes.
  // Imagine checkmarks next to each declared dependency.
  declaredDependencies.forEach(({key}) => {
    const node = getOrCreateNodeByPath(depTree, key);
    node.isSatisfiedRecursively = true;
  });
  stableDependencies.forEach(key => {
    const node = getOrCreateNodeByPath(depTree, key);
    node.isSatisfiedRecursively = true;
  });

  // Tree manipulation helpers.
  function getOrCreateNodeByPath(rootNode, path) {
    const keys = path.split('.');
    let node = rootNode;
    for (const key of keys) {
      let child = node.children.get(key);
      if (!child) {
        child = createDepTree();
        node.children.set(key, child);
      }
      node = child;
    }
    return node;
  }
  function markAllParentsByPath(rootNode, path, fn) {
    const keys = path.split('.');
    let node = rootNode;
    for (const key of keys) {
      const child = node.children.get(key);
      if (!child) {
        return;
      }
      fn(child);
      node = child;
    }
  }

  // Now we can learn which dependencies are missing or necessary.
  const missingDependencies = new Set();
  const satisfyingDependencies = new Set();
  scanTreeRecursively(
    depTree,
    missingDependencies,
    satisfyingDependencies,
    key => key,
  );
  function scanTreeRecursively(node, missingPaths, satisfyingPaths, keyToPath) {
    node.children.forEach((child, key) => {
      const path = keyToPath(key);
      if (child.isSatisfiedRecursively) {
        if (child.isSubtreeUsed) {
          // Remember this dep actually satisfied something.
          satisfyingPaths.add(path);
        }
        // It doesn't matter if there's something deeper.
        // It would be transitively satisfied since we assume immutability.
        // `props.foo` is enough if you read `props.foo.id`.
        return;
      }
      if (child.isUsed) {
        // Remember that no declared deps satisfied this node.
        missingPaths.add(path);
        // If we got here, nothing in its subtree was satisfied.
        // No need to search further.
        return;
      }
      scanTreeRecursively(
        child,
        missingPaths,
        satisfyingPaths,
        childKey => path + '.' + childKey,
      );
    });
  }

  // Collect suggestions in the order they were originally specified.
  const suggestedDependencies = [];
  const unnecessaryDependencies = new Set();
  const duplicateDependencies = new Set();
  declaredDependencies.forEach(({key}) => {
    // Does this declared dep satisfy a real need?
    if (satisfyingDependencies.has(key)) {
      if (suggestedDependencies.indexOf(key) === -1) {
        // Good one.
        suggestedDependencies.push(key);
      } else {
        // Duplicate.
        duplicateDependencies.add(key);
      }
    } else {
      // It's definitely not needed.
      unnecessaryDependencies.add(key);
    }
  });

  // Then add the missing ones at the end.
  missingDependencies.forEach(key => {
    suggestedDependencies.push(key);
  });

  return {
    suggestedDependencies,
    unnecessaryDependencies,
    duplicateDependencies,
    missingDependencies,
  };
}

// If the node will result in constructing a referentially unique value, return
// its human readable type name, else return null.
function getConstructionExpressionType(node) {
  // eslint-disable-next-line default-case
  switch (node.type) {
    case 'ObjectExpression':
      return 'object';
    case 'ArrayExpression':
      return 'array';
    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
      return 'function';
    case 'ClassExpression':
      return 'class';
    case 'ConditionalExpression':
      if (
        getConstructionExpressionType(node.consequent) != null ||
        getConstructionExpressionType(node.alternate) != null
      ) {
        return 'conditional';
      }
      return null;
    case 'LogicalExpression':
      if (
        getConstructionExpressionType(node.left) != null ||
        getConstructionExpressionType(node.right) != null
      ) {
        return 'logical expression';
      }
      return null;
    case 'JSXFragment':
      return 'JSX fragment';
    case 'JSXElement':
      return 'JSX element';
    case 'AssignmentExpression':
      if (getConstructionExpressionType(node.right) != null) {
        return 'assignment expression';
      }
      return null;
    case 'NewExpression':
      return 'object construction';
    case 'Literal':
      if (node.value instanceof RegExp) {
        return 'regular expression';
      }
      return null;
    case 'TypeCastExpression':
      return getConstructionExpressionType(node.expression);
    case 'TSAsExpression':
      return getConstructionExpressionType(node.expression);
  }
  return null;
}

// Finds variables declared as dependencies
// that would invalidate on every render.
function scanForConstructions({
  declaredDependencies,
  declaredDependenciesNode,
  componentScope,
  scope,
}) {
  const constructions = declaredDependencies
    .map(({key}) => {
      const ref = componentScope.variables.find(v => v.name === key);
      if (ref == null) {
        return null;
      }

      const node = ref.defs[0];
      if (node == null) {
        return null;
      }
      // const handleChange = function () {}
      // const handleChange = () => {}
      // const foo = {}
      // const foo = []
      // etc.
      if (
        node.type === 'Variable' &&
        node.node.type === 'VariableDeclarator' &&
        node.node.id.type === 'Identifier' && // Ensure this is not destructed assignment
        node.node.init != null
      ) {
        const constantExpressionType = getConstructionExpressionType(
          node.node.init,
        );
        if (constantExpressionType != null) {
          return [ref, constantExpressionType];
        }
      }
      // function handleChange() {}
      if (
        node.type === 'FunctionName' &&
        node.node.type === 'FunctionDeclaration'
      ) {
        return [ref, 'function'];
      }

      // class Foo {}
      if (node.type === 'ClassName' && node.node.type === 'ClassDeclaration') {
        return [ref, 'class'];
      }
      return null;
    })
    .filter(Boolean);

  function isUsedOutsideOfHook(ref) {
    let foundWriteExpr = false;
    for (let i = 0; i < ref.references.length; i++) {
      const reference = ref.references[i];
      if (reference.writeExpr) {
        if (foundWriteExpr) {
          // Two writes to the same function.
          return true;
        } else {
          // Ignore first write as it's not usage.
          foundWriteExpr = true;
          continue;
        }
      }
      let currentScope = reference.from;
      while (currentScope !== scope && currentScope != null) {
        currentScope = currentScope.upper;
      }
      if (currentScope !== scope) {
        // This reference is outside the Hook callback.
        // It can only be legit if it's the deps array.
        if (!isAncestorNodeOf(declaredDependenciesNode, reference.identifier)) {
          return true;
        }
      }
    }
    return false;
  }

  return constructions.map(([ref, depType]) => ({
    construction: ref.defs[0],
    depType,
    isUsedOutsideOfHook: isUsedOutsideOfHook(ref),
  }));
}

/**
 * Assuming () means the passed/returned node:
 * (props) => (props)
 * props.(foo) => (props.foo)
 * props.foo.(bar) => (props).foo.bar
 * props.foo.bar.(baz) => (props).foo.bar.baz
 */
function getDependency(node) {
  if (
    (node.parent.type === 'MemberExpression' ||
      node.parent.type === 'OptionalMemberExpression') &&
    node.parent.object === node &&
    node.parent.property.name !== 'current' &&
    !node.parent.computed &&
    !(
      node.parent.parent != null &&
      (node.parent.parent.type === 'CallExpression' ||
        node.parent.parent.type === 'OptionalCallExpression') &&
      node.parent.parent.callee === node.parent
    )
  ) {
    return getDependency(node.parent);
  } else if (
    // Note: we don't check OptionalMemberExpression because it can't be LHS.
    node.type === 'MemberExpression' &&
    node.parent &&
    node.parent.type === 'AssignmentExpression' &&
    node.parent.left === node
  ) {
    return node.object;
  } else {
    return node;
  }
}

/**
 * Mark a node as either optional or required.
 * Note: If the node argument is an OptionalMemberExpression, it doesn't necessarily mean it is optional.
 * It just means there is an optional member somewhere inside.
 * This particular node might still represent a required member, so check .optional field.
 */
function markNode(node, optionalChains, result) {
  if (optionalChains) {
    if (node.optional) {
      // We only want to consider it optional if *all* usages were optional.
      if (!optionalChains.has(result)) {
        // Mark as (maybe) optional. If there's a required usage, this will be overridden.
        optionalChains.set(result, true);
      }
    } else {
      // Mark as required.
      optionalChains.set(result, false);
    }
  }
}

/**
 * Assuming () means the passed node.
 * (foo) -> 'foo'
 * foo(.)bar -> 'foo.bar'
 * foo.bar(.)baz -> 'foo.bar.baz'
 * Otherwise throw.
 */
function analyzePropertyChain(node, optionalChains) {
  if (node.type === 'Identifier' || node.type === 'JSXIdentifier') {
    const result = node.name;
    if (optionalChains) {
      // Mark as required.
      optionalChains.set(result, false);
    }
    return result;
  } else if (node.type === 'MemberExpression' && !node.computed) {
    const object = analyzePropertyChain(node.object, optionalChains);
    const property = analyzePropertyChain(node.property, null);
    const result = `${object}.${property}`;
    markNode(node, optionalChains, result);
    return result;
  } else if (node.type === 'OptionalMemberExpression' && !node.computed) {
    const object = analyzePropertyChain(node.object, optionalChains);
    const property = analyzePropertyChain(node.property, null);
    const result = `${object}.${property}`;
    markNode(node, optionalChains, result);
    return result;
  } else if (node.type === 'ChainExpression' && !node.computed) {
    const expression = node.expression;

    if (expression.type === 'CallExpression') {
      throw new Error(`Unsupported node type: ${expression.type}`);
    }

    const object = analyzePropertyChain(expression.object, optionalChains);
    const property = analyzePropertyChain(expression.property, null);
    const result = `${object}.${property}`;
    markNode(expression, optionalChains, result);
    return result;
  } else {
    throw new Error(`Unsupported node type: ${node.type}`);
  }
}

function getNodeWithoutRefuncNamespace(node, options) {
  if (
    node.type === 'MemberExpression' &&
    node.object.type === 'Identifier' &&
    node.object.name === 'Refunc' &&
    node.property.type === 'Identifier' &&
    !node.computed
  ) {
    return node.property;
  }
  return node;
}

// What's the index of callback that needs to be analyzed for a given Hook?
// -1 if it's not a Hook we care about (e.g. useState).
// 0 for useEffect/hookMemo/useCallback(fn).
// 1 for useImperativeHandle(ref, fn).
// For additionally configured Hooks, assume that they're like useEffect (0).
function getReactiveHookCallbackIndex(calleeNode, options, callNode) {
  const node = getNodeWithoutRefuncNamespace(calleeNode);
  if (node.type !== 'Identifier') {
    return -1;
  }
  switch (node.name) {
    case 'hookMemo':
      if (callNode.arguments.length === 3) {
        // hookMemo(fn, deps, eq)
        // don't check hookMemo with eq function
        return -1;
      }
      // hookMemo(fn, deps)
      // check this!
      return 0;
    default:
      if (node === calleeNode && options && options.additionalHooks) {
        // Allow the user to provide a regular expression which enables the lint to
        // target custom reactive hooks.
        let name;
        try {
          name = analyzePropertyChain(node, null);
        } catch (error) {
          if (/Unsupported node type/.test(error.message)) {
            return 0;
          } else {
            throw error;
          }
        }
        return options.additionalHooks.test(name) ? 0 : -1;
      } else {
        return -1;
      }
  }
}

/**
 * ESLint won't assign node.parent to references from context.getScope()
 *
 * So instead we search for the node from an ancestor assigning node.parent
 * as we go. This mutates the AST.
 *
 * This traversal is:
 * - optimized by only searching nodes with a range surrounding our target node
 * - agnostic to AST node types, it looks for `{ type: string, ... }`
 */
function fastFindReferenceWithParent(start, target) {
  const queue = [start];
  let item = null;

  while (queue.length) {
    item = queue.shift();

    if (isSameIdentifier(item, target)) {
      return item;
    }

    if (!isAncestorNodeOf(item, target)) {
      continue;
    }

    for (const [key, value] of Object.entries(item)) {
      if (key === 'parent') {
        continue;
      }
      if (isNodeLike(value)) {
        value.parent = item;
        queue.push(value);
      } else if (Array.isArray(value)) {
        // eslint-disable-next-line no-loop-func
        value.forEach(val => {
          if (isNodeLike(val)) {
            val.parent = item;
            queue.push(val);
          }
        });
      }
    }
  }

  return null;
}

function joinEnglish(arr) {
  let s = '';
  for (let i = 0; i < arr.length; i++) {
    s += arr[i];
    if (i === 0 && arr.length === 2) {
      s += ' and ';
    } else if (i === arr.length - 2 && arr.length > 2) {
      s += ', and ';
    } else if (i < arr.length - 1) {
      s += ', ';
    }
  }
  return s;
}

function isNodeLike(val) {
  return (
    typeof val === 'object' &&
    val !== null &&
    !Array.isArray(val) &&
    typeof val.type === 'string'
  );
}

function isSameIdentifier(a, b) {
  return (
    (a.type === 'Identifier' || a.type === 'JSXIdentifier') &&
    a.type === b.type &&
    a.name === b.name &&
    a.range[0] === b.range[0] &&
    a.range[1] === b.range[1]
  );
}

function isAncestorNodeOf(a, b) {
  return a.range[0] <= b.range[0] && a.range[1] >= b.range[1];
}
