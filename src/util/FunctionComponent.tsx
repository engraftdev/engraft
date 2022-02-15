import { ReactElement } from 'react';

interface Props {
    f: (() => ReactElement<any, any> | null) | null,
    ifMissing?: ReactElement<any, any>
}

export default function FunctionComponent({f, ifMissing}: Props) {
    if (f) {
        return f();
    } else if (ifMissing) {
        return ifMissing;
    } else {
        throw new Error("missing f for FunctionComponent");
    }
}