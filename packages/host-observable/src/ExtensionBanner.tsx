import React, {Dispatch, SetStateAction} from 'react';
import {ToolProgram} from "@engraft/core";

type ExtensionBannerProps = {
    active: boolean,
    program: ToolProgram,
    version: number,
    hide: boolean,
    setHide: Dispatch<SetStateAction<boolean>>
}
const ExtensionBanner = ({active, program, version, hide, setHide}:ExtensionBannerProps) => (
    <div className={`bannerContainer`}>
        <div className={'toolbar'}>
            <button onClick={()=> navigator.clipboard.writeText(JSON.stringify(program))}>
                Copy Program
            </button>
            <div>
                <b>Show Editor</b> <input type="checkbox" checked={!hide} onChange={()=>setHide(!hide)} style={{margin: 0}}/>
            </div>
        </div>
        {
            (active) ?
            <ExtensionActive version={version}/>
            :
            <ExtensionInactive/>
        }
    </div>
)

const ExtensionActive = ({version}:{version: number}) => {
    return (
        <div className={'ext-active'}>
            <div>Engraft Extension Running</div>
            <div>Version {version}</div>
        </div>
    )
}

const ExtensionInactive = () => {
    return (
        <div className={'ext-inactive'}>
            <div>
                <b>Warning: Engraft Extension Not Installed!</b>
                <div>Changes are not saved, copy cell contents manually.</div>
            </div>
            <div>
                Learn more: <u>https://engraft.dev</u>
            </div>
        </div>
    )
}

export default ExtensionBanner