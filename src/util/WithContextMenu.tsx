import * as React from 'react'
import * as ReactDOM from 'react-dom'
import cssWithContextMenu from './WithContextMenu.css';
import cssContextmenu from './WithContextMenu-contextmenu.css'

import classNames from 'classnames'
import IsolateStyles from '../view/IsolateStyles';


export type MenuItem =
  {
    type: 'contents',
    contents: React.ReactNode,
    onClick?: () => void,
    onMouseMove?: () => void,
    onMouseLeave?: () => void,
  } |
  {
    type: 'heading',
    heading: string,
  } |
  {
    type: 'divider'
  }

export type Menu = Array<MenuItem>

export type MenuMaker = () => Menu

const {Provider: ParentMenuMakerProvider, Consumer: ParentMenuMakerConsumer} = React.createContext<MenuMaker>(() => []);

export class WithContextMenu extends React.Component<{
  children: React.ReactNode,
  menuMaker: MenuMaker,
  divProps?: React.HTMLProps<HTMLDivElement>,
}> {

  state = {
    active: false,
    currentMenu: undefined as React.ReactNode | undefined
  }

  render() {
    return <ParentMenuMakerConsumer>
      {parentMenuMaker => this.renderWithParentMenu(parentMenuMaker)}
    </ParentMenuMakerConsumer>
  }

  renderWithParentMenu(parentMenuMaker: MenuMaker) {
    const { children, divProps } = this.props
    const { currentMenu, active } = this.state

    let currentMenuInPortal = undefined
    if (currentMenu) {
      currentMenuInPortal = ReactDOM.createPortal(currentMenu, window.document.body)
    }

    return <>
      <ParentMenuMakerProvider value={() => this.constructWholeMenu(parentMenuMaker)}>
        <div className="WithContextMenu"
             onClick={(event) => this.onContextMenu(event, parentMenuMaker)}
             style={active ? {filter: "drop-shadow(0px 0px 10px red)"} : {}}
             {...divProps}>
          {children}
        </div>
      </ParentMenuMakerProvider>
      {currentMenuInPortal}
    </>
  }

  constructWholeMenu(parentMenuMaker: MenuMaker): Menu {
    const { menuMaker } = this.props

    const parentMenu = parentMenuMaker()
    const menu = menuMaker()
    menu.forEach((menuItem) => {
      if (menuItem.type === 'contents') {
        menuItem.onMouseMove = () => this.setState({ active: true })
        menuItem.onMouseLeave = () => this.setState({ active: false })
      }
    })

    if (parentMenu.length > 0) {
      const maybeHeading: Menu = (parentMenu[0].type === 'heading' ? [] : [{type: 'divider'}])
      return [
        ...menu,
        ...maybeHeading,
        ...parentMenu
      ]
    } else {
      return menu
    }
  }

  onContextMenu = (event: React.MouseEvent<HTMLDivElement>, parentMenuMaker: MenuMaker) => {
    event.preventDefault()
    event.stopPropagation()

    const currentMenu =
      <ContextMenu
        x={event.pageX} y={event.pageY}
        closeMenu={this.closeContextMenu}
        menu={this.constructWholeMenu(parentMenuMaker)}
      />
    this.setState({ currentMenu })
  }

  closeContextMenu = () => {
    this.setState({ currentMenu: null })
  }
}

class ContextMenu extends React.Component<{
  x: number,
  y: number,
  menu: Menu,
  closeMenu: () => void,
}> {

  state = { selectedChild: null }
  ref = React.createRef<HTMLDivElement>()

  render() {
    const { x, y, menu, closeMenu } = this.props
    const { selectedChild } = this.state

    return (
      <IsolateStyles>
        <div ref={this.ref} className='react-contextmenu'
                    style={{ position: 'absolute', left: x, top: y }}>
          <style>
            {cssWithContextMenu}
            {cssContextmenu}
          </style>
          {menu.map((item, i) => {
            if (item.type === 'divider') {
              return <div key={i} className="react-contextmenu-item--divider"/>
            } else if (item.type === 'heading') {
              return <div key={i} className="react-contextmenu-item--divider react-contextmenu-item--heading" style={{height: 18}}>
                <span style={{
                  display: 'inline-block',
                  // background: 'white',
                  marginLeft: '5px',
                  fontSize: 9,
                }}>{item.heading}</span>
              </div>
            } else {
              return <ContextMenuItem
                key={i} contents={item.contents}
                isSelected={selectedChild === i}
                onMouseMove={() => {
                  this.setState({selectedChild: i})
                  item.onMouseMove && item.onMouseMove()
                }}
                onMouseLeave={() => {
                  this.setState({selectedChild: null})
                  item.onMouseLeave && item.onMouseLeave()
                }}
                onClick={() => {
                  item.onMouseLeave && item.onMouseLeave()
                  item.onClick && item.onClick()
                  closeMenu()
                }}
              />
            }
          })}
        </div>
      </IsolateStyles>
    );
  }

  componentDidMount() {
    window.document.addEventListener('mousedown', this.onDocumentMouseDown);
  }

  componentWillUnmount() {
    window.document.removeEventListener('mousedown', this.onDocumentMouseDown);
  }

  onDocumentMouseDown = (event: MouseEvent) => {
    if (!(this.ref.current && event.target && this.ref.current.contains(event.target as Node))) {
      const { closeMenu } = this.props
      closeMenu()
    }
  }
}

class ContextMenuItem extends React.Component<{
  isSelected: boolean,
  contents: React.ReactNode,
  onClick?: () => void,
  onMouseMove?: () => void,
  onMouseLeave?: () => void,
}> {
  render() {
    const { contents, isSelected, onMouseMove, onMouseLeave, onClick } = this.props
    return (
      <div
        className={classNames('react-contextmenu-item', {'react-contextmenu-item--selected': isSelected})}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
      >
        {contents}
      </div>
    )
  }
}
