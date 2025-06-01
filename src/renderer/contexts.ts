import {createContext} from '@lit/context';
import { ElectronIPC } from './ipc';

export const ipcContext = createContext<ElectronIPC>('ipc');
