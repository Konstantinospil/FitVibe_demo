"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __exportStar =
  (this && this.__exportStar) ||
  function (m, exports) {
    for (var p in m)
      if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
        __createBinding(exports, m, p);
  };
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
var knex_1 = require("knex");
var knexfile_js_1 = require("./knexfile.js");
var connection_js_1 = require("./connection.js");
var env = (_a = process.env.NODE_ENV) !== null && _a !== void 0 ? _a : "development";
var configurations = knexfile_js_1.default;
exports.db = configurations[env] ? (0, knex_1.default)(configurations[env]) : connection_js_1.db;
__exportStar(require("./connection.js"), exports);
exports.default = exports.db;
