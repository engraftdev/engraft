import { ReactElement } from "react";
import TestRenderer from "react-test-renderer";


export default class ReactCell {
  testRenderer: TestRenderer.ReactTestRenderer | undefined;

  update(element: ReactElement) {
    TestRenderer.act(() => {  // TODO: is this helpful?
      if (!this.testRenderer) {
        this.testRenderer = TestRenderer.create(element);
      } else {
        this.testRenderer.update(element);
      }
    });
  }

  destroy() {
    if (this.testRenderer) {
      this.testRenderer.unmount();
    }
  }
}

// if u ever wanna play with intrinsic elements...

// declare global {
//   namespace JSX {
//     interface IntrinsicElements {
//       foo: any;
//     }
//   }
// }
