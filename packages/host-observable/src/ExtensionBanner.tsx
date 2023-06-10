import React, {Dispatch, SetStateAction} from 'react';
import {ToolProgram} from "@engraft/core";

type ExtensionBannerProps = {
    extensionDetected: boolean,
    program: ToolProgram,
    version: number,
    editorHidden: boolean,
    setEditorHidden: Dispatch<SetStateAction<boolean>>
}
const ExtensionBanner = ({extensionDetected, program, version, editorHidden, setEditorHidden}:ExtensionBannerProps) => (
    <div className={`bannerContainer`}>
        <div className={'bannerToolbar'}>
            <button onClick={()=> navigator.clipboard.writeText(JSON.stringify(program))}>
                Copy Program
            </button>
            <div>
                <b>Show Editor</b> <input type="checkbox" checked={!editorHidden} onChange={()=>setEditorHidden(!editorHidden)} style={{margin: 0}}/>
            </div>
        </div>
        {
            (extensionDetected) ?
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