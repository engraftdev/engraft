import React from 'react';
import {ToolProgram} from "@engraft/core";

type ExtensionBannerProps = {
    active: boolean,
    program : ToolProgram,
    version: number
}
const ExtensionBanner = ({active, program, version}:ExtensionBannerProps) => {
    return (active) ?
        <ExtensionActive version={version}/>
        :
        <ExtensionInactive program={program}/>
}

const ExtensionActive = ({version}:{version: number}) => {
    return (
        <div className="bannerContainer ext-active">
            <div>Engraft Extension Running</div>
            <div>Version {version}</div>
        </div>
    )
}

const ExtensionInactive = ({program}: {program : ToolProgram}) => {
    return (
        <div className="bannerContainer ext-inactive">
            <div>
                <b>Warning: Engraft Extension Not Installed!</b>
                <div>Changes are not saved, copy cell contents manually.</div>
                <div>
                    Learn more: <u>https://engraft.dev</u>
                </div>
            </div>
            <div className="btn-grp">
                <button onClick={()=> navigator.clipboard.writeText(JSON.stringify(program))}>
                    Copy Program
                </button>
            </div>
        </div>
    )
}

export default ExtensionBanner