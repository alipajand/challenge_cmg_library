import '@testing-library/jest-dom';
import { Blob, File } from 'node:buffer';
import { TextDecoderStream } from 'node:stream/web';

Object.assign(globalThis, { Blob, File, TextDecoderStream });
