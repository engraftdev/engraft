import { ReactElement } from 'react';

interface Props {
    f: () => ReactElement<any, any> | null,
}

export default function CallFunction({f}: Props) {
    return f();
}