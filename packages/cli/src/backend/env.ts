
import { GlobalRegistrator } from '@happy-dom/global-registrator';

// TODO: ideally there would be a cheaper way to deal with upstream deps
// expecting a browser environment...
GlobalRegistrator.register();
