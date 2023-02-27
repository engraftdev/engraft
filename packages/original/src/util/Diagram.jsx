import * as React from 'react';

// import PropTypes from 'prop-types'
// import exact from 'prop-types-exact'

class DiagramNode extends React.Component {
  render() {
    const {diagram} = this.props
    try {
      switch (diagram.type) {
      case 'circle': {
        const center = Diagram.get(diagram, 'center')
        const radius = Diagram.get(diagram, 'radius')
        return <circle cx={center.x} cy={center.y} r={radius} style={pathStyle(diagram)}/>
      }
      case 'line': {
        const from = Diagram.get(diagram, 'from')
        const to = Diagram.get(diagram, 'to')
        return <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} style={pathStyle(diagram)}/>
      }
      case 'path': {
        const pathString =
          'M '
          + Diagram.get(diagram, 'points')
                   .map(({x, y}) => x + ',' + y)
                   .join(' L ')
          + (Diagram.get(diagram, 'closed') ? ' Z' : '')
        return <path d={pathString} style={pathStyle(diagram)}/>
      }
      case 'rect': {
        const position = Diagram.get(diagram, 'position')
        const width = Diagram.get(diagram, 'width')
        const height = Diagram.get(diagram, 'height')
        return <rect x={position.x} y={position.y} width={width} height={height} style={pathStyle(diagram)}/>
      }
      case 'text': {
        const position = Diagram.get(diagram, 'position')
        return (
          <text
            x={position.x} y={position.y}
            style={{
              ...pathStyle(diagram),
              textAnchor: {left: 'start', middle: 'middle', right: 'end'}[Diagram.get(diagram, 'hAlign')],
              dominantBaseline: {bottom: 'baseline', middle: 'central', top: 'hanging'}[Diagram.get(diagram, 'vAlign')],
            }}
          >
            {Diagram.get(diagram, 'text')}
          </text>
        )
      }
      case 'group': {
        const children = Diagram.get(diagram, 'children')
        const scale = Diagram.get(diagram, 'scale')
        const rotate = Diagram.get(diagram, 'rotate')
        const translation = Diagram.get(diagram, 'translation')
        return <g transform={`translate(${translation.x}, ${translation.y}) rotate(${rotate}) scale(${scale})`}>
          {children.map((child, i) => <DiagramNode key={i} diagram={child} />)}
        </g>
      }
      default:
        return <g></g>
      }
    } catch (err) {
      console.error("Error drawing diagram", diagram, err)
      return <g></g>
    }
  }
}

class Diagram extends React.Component {
  render() {
    const {diagram, width, height} = this.props
    return <svg width={width} height={height} viewBox="-10 -10 20 20">
      <DiagramNode diagram={diagram} />
    </svg>
  }
}

Diagram.get = (diagram, prop) => {
  return diagram[prop] !== undefined
         ? diagram[prop]
         : Diagram[diagram.type].defaults[prop]
}

Diagram.diagram = () =>
  ({isDiagram: true})

const pathDefaults = {
  strokeColor: 'black',
  strokeWidth: 2,
  strokeScale: true,

  fillColor: 'transparent',
}

function pathStyle(diagram) {
  return {
    stroke: Diagram.get(diagram, 'strokeColor'),
    strokeWidth: Diagram.get(diagram, 'strokeWidth'),
    ...(Diagram.get(diagram, 'strokeScale')
        ? { vectorEffect: 'non-scaling-stroke' }
        : { }),

    fill: Diagram.get(diagram, 'fillColor'),
  }
}

Diagram.circle = (opts) =>
  ({
    type: 'circle',
    ...Diagram.diagram(),
    ...opts || {}
  })
Diagram.circle.defaults = {
  center: {x: 0, y: 0},
  radius: 1,
  ...pathDefaults,
}

Diagram.line = (opts) =>
  ({
    type: 'line',
    ...Diagram.diagram(),
    ...opts || {}
  })
Diagram.line.defaults = {
  ...pathDefaults,
}

Diagram.path = (opts) =>
  ({
    type: 'path',
    ...Diagram.diagram(),
    ...opts || {}
  })
Diagram.path.defaults = {
  ...pathDefaults,
  closed: true,
}

Diagram.rect = (opts) =>
  ({
    type: 'rect',
    position: {x: -3, y: -3},
    width: 6,
    height: 6,
    ...Diagram.diagram(),
    ...opts || {}
  })
Diagram.rect.defaults = {
  ...pathDefaults,
}

Diagram.text = (opts) =>
  ({
    type: 'text',
    ...Diagram.diagram(),
    ...opts || {}
  })
Diagram.text.defaults = {
  ...pathDefaults,
  strokeColor: 'transparent',
  fillColor: 'black',
  hAlign: 'middle',
  vAlign: 'middle',
  position: {x: 0, y: 0},
}

Diagram.group = (opts) =>
  ({
    type: 'group',
    ...Diagram.diagram(),
    ...opts || {}
  })
Diagram.group.defaults = {
  scale: 1,
  translation: {x: 0, y: 0},
  rotate: 0,
  children: [],
}

Diagram.scale = (shape, scale) => {
  if (shape.type === 'group') {
    return { ...shape, scale: Diagram.get(shape, 'scale') * scale }
  } else {
    return Diagram.group({children: [shape], scale})
  }
}

function vec2Add({x: x1, y: y1}, {x: x2, y: y2}) {
  return {x: x1 + x2, y: y1 + y2}
}

Diagram.translate = (shape, translation) => {
  if (shape.type === 'group') {
    return { ...shape, translation: vec2Add(Diagram.get(shape, 'translation'), translation) }
  } else {
    return Diagram.group({children: [shape], translation})
  }
}

Diagram.rotate = (shape, rotate) => {
  if (shape.type === 'group') {
    return { ...shape, rotate: Diagram.get(shape, 'rotate') + rotate }
  } else {
    return Diagram.group({children: [shape], rotate})
  }
}

export default Diagram
