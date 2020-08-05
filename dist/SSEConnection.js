"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SSEConnection = void 0;
const EventGenerator_1 = require("./EventGenerator");
class SSEConnection {
    constructor(accessToken, request, response, accessModel, uuid, cleanCallback) {
        this.scopeFilter = {};
        this.count = 0;
        this.accessToken = accessToken;
        this.accessModel = accessModel;
        this.request = request;
        this.response = response;
        this.cleanCallback = cleanCallback;
        this.uuid = uuid;
        this.expirationDate = new Date(accessModel.createdAt).valueOf() + 1000 * accessModel.ttl;
        // A HTTP connection times out after 2 minutes. To avoid this, we send keep alive messages every 30 seconds
        this.keepAliveTimer = setInterval(() => {
            // since we start this message with a colon (:), the client will not see it as a message.
            this.response.write(':ping\n\n');
            let pingEvent = { type: "ping", counter: this.count++ };
            this._transmit("data:" + JSON.stringify(pingEvent) + "\n\n");
            // if we are going to use the compression lib for express, we need to flush after a write.
            this.response.flushHeaders();
        }, 30000);
        if (this._checkIfTokenIsExpired()) {
            this.destroy(EventGenerator_1.EventGenerator.getErrorEvent(401, "TOKEN_EXPIRED", "Token Expired."));
            return;
        }
        // generate a filter based on the scope permissions.
        this.generateFilterFromScope();
        this.request.once('close', () => {
            this.destroy(EventGenerator_1.EventGenerator.getErrorEvent(408, "STREAM_CLOSED", "Event stream has been closed."));
        });
    }
    generateFilterFromScope() {
        if (this.accessModel.scopes.indexOf("all") !== -1) {
            this.scopeFilter = true;
            return;
        }
        this.scopeFilter = {};
        if (this.accessModel.scopes.indexOf("user_location") !== -1) {
            if (this.scopeFilter["presence"] === undefined) {
                this.scopeFilter["presence"] = {};
            }
            this.scopeFilter["presence"]["*"] = (eventData) => { return eventData.user.id === this.accessModel.userId; };
        }
        if (this.accessModel.scopes.indexOf("stone_information") !== -1) {
            if (this.scopeFilter["dataChange"] === undefined) {
                this.scopeFilter["dataChange"] = {};
            }
            if (this.scopeFilter["abilityChange"] === undefined) {
                this.scopeFilter["abilityChange"] = {};
            }
            if (this.scopeFilter["switchStateUpdate"] === undefined) {
                this.scopeFilter["switchStateUpdate"] = {};
            }
            this.scopeFilter["dataChange"]["stones"] = () => true;
            this.scopeFilter["abilityChange"]["*"] = () => true;
            this.scopeFilter["switchStateUpdate"]["stone"] = () => true;
        }
        if (this.accessModel.scopes.indexOf("sphere_information") !== -1) {
            if (this.scopeFilter["dataChange"] === undefined) {
                this.scopeFilter["dataChange"] = {};
            }
            this.scopeFilter["dataChange"]["stones"] = () => true;
            this.scopeFilter["dataChange"]["locations"] = () => true;
            this.scopeFilter["dataChange"]["spheres"] = () => true;
        }
        if (this.accessModel.scopes.indexOf("switch_stone") !== -1) {
            if (this.scopeFilter["command"] === undefined) {
                this.scopeFilter["command"] = {};
            }
            this.scopeFilter["command"]["switchCrownstone"] = () => true;
            this.scopeFilter["command"]["multiSwitch"] = () => true;
        }
        if (this.accessModel.scopes.indexOf("location_information") !== -1) {
            if (this.scopeFilter["dataChange"] === undefined) {
                this.scopeFilter["dataChange"] = {};
            }
            this.scopeFilter["dataChange"]["locations"] = () => true;
        }
        if (this.accessModel.scopes.indexOf("user_information") !== -1) {
            if (this.scopeFilter["dataChange"] === undefined) {
                this.scopeFilter["dataChange"] = {};
            }
            this.scopeFilter["dataChange"]["users"] = (eventData) => { return eventData.changedItem.id === this.accessModel.userId; };
        }
        // if (this.accessModel.scopes.indexOf("power_consumption") !== -1) {}
        // if (this.accessModel.scopes.indexOf("user_id")          !== -1) {}
    }
    destroy(message = "") {
        clearInterval(this.keepAliveTimer);
        this.response.end(message);
        this.cleanCallback();
    }
    dispatch(dataStringified, eventData) {
        if (this._checkIfTokenIsExpired()) {
            return this.destroy(EventGenerator_1.EventGenerator.getErrorEvent(401, "TOKEN_EXPIRED", "Token Expired."));
        }
        if (this.checkScopePermissions(eventData)) {
            this._transmit("data:" + dataStringified + "\n\n");
        }
    }
    checkScopePermissions(eventData) {
        if (this.scopeFilter === true) {
            return true;
        }
        let typeFilter = this.scopeFilter[eventData.type];
        if (typeFilter) {
            if (typeFilter["*"] !== undefined) {
                return typeFilter["*"](eventData);
            }
            else {
                let subType = "";
                if ("subType" in eventData) {
                    subType = eventData.subType;
                }
                else if ("operation" in eventData) {
                    subType = eventData.operation;
                }
                if (typeFilter[subType] !== undefined) {
                    return typeFilter[subType](eventData);
                }
            }
        }
        return false;
    }
    _transmit(data) {
        this.response.write(data);
        // if we are going to use the compression lib for express, we need to flush after a write.
        this.response.flushHeaders();
    }
    _checkIfTokenIsExpired() {
        return new Date().valueOf() >= this.expirationDate;
    }
}
exports.SSEConnection = SSEConnection;
//# sourceMappingURL=SSEConnection.js.map