// adapted from https://github.com/marcelklehr/toposort/blob/master/index.js

// An edge [x, y] means that x depends on y.
// We return two things...
//   sorted: a list of items, in an order such that if [x, y] is an edge, y
//           will occur before x in sorted
//   cyclic: a set of items which are either in a cycle, or downstream of a cycle
//           (I guess edges point upstream...)

export type Edge = [string, string];

export function toposortFromEdges(nodes: string[], edges: Edge[]) {
  const outgoingEdges = makeOutgoingEdges(edges);
  return toposort(nodes, outgoingEdges);
}

export function toposort(nodes: string[], outgoingEdges: {[node: string]: Set<string>}) {
  let visited = new Set<string>();

  let sorted = [] as string[];
  let cyclic = new Set<string>();

  // check for unknown nodes in `outgoingEdges`
  Object.entries(outgoingEdges).forEach(([node, outgoing]) => {
    if (!nodes.includes(node) || [...outgoing].some((child) => !nodes.includes(child))) {
      throw new Error('Unknown node. There is an unknown node in the supplied outgoingEdges.')
    }
  });

  nodes.forEach((node) => visit(node, new Set()));

  return {sorted, cyclic};

  // returns `true` if the node is in or downstream of a cycle
  function visit(node: string, path: Set<string>): boolean {
    if(path.has(node)) {
      return true;
    }

    if (visited.has(node)) { return cyclic.has(node); }
    visited.add(node);

    const outgoing = outgoingEdges[node] || new Set();

    let inCycle = false;
    if (outgoing.size > 0) {
      path.add(node)
      outgoing.forEach((child) => {
        if (visit(child, path)) {
          inCycle = true;
        }
      })
      path.delete(node)
    }

    if (inCycle) {
      cyclic.add(node);
      return true;
    } else {
      sorted.push(node);
      return false;
    }
  }
}

function makeOutgoingEdges(edges: Edge[]){
  var outgoingEdges: {[node: string]: Set<string>} = {};
  edges.forEach((edge) => {
    let outgoing: Set<string> | undefined = outgoingEdges[edge[0]];
    if (!outgoing) { outgoingEdges[edge[0]] = outgoing = new Set(); }
    outgoing.add(edge[1]);
  });
  return outgoingEdges;
}
