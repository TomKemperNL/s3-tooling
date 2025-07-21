import {createContext} from '@lit/context';
import { BackendApi } from './backend';

export const ipcContext = createContext<BackendApi>('ipc');
