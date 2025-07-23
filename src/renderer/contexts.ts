import {createContext} from '@lit/context';
import { BackendApi } from '../backend-api';

export const ipcContext = createContext<BackendApi>('ipc');
