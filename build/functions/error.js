"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.error = void 0;
class error extends Error {
    constructor(msg) {
        super(msg);
        this.name = 'M3U8Error';
    }
}
exports.error = error;
//# sourceMappingURL=error.js.map