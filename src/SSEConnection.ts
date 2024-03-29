import {Request, Response} from "express-serve-static-core";
import {EventGenerator} from "./EventGenerator";
import {checkScopePermissions, generateFilterFromScope} from "./ScopeFilter";
import Timeout = NodeJS.Timeout;

export class SSEConnection {
  accessToken : string;
  accessModel : AccessModel;
  scopeFilter : ScopeFilter | true = {};
  request : Request;
  response : Response;
  keepAliveTimer : Timeout;
  count = 0
  connected = false;

  _destroyed = false;
  expirationDate : number
  uuid : string;
  projectName: string;

  cleanCallback : () => void;

  constructor(accessToken : string, request: Request, response : Response, accessModel: AccessModel, uuid: string, projectName: string, cleanCallback: () => void) {
    this.accessToken   = accessToken;
    this.accessModel   = accessModel;
    this.request       = request;
    this.response      = response;
    this.cleanCallback = cleanCallback;
    this.uuid          = uuid;
    this.projectName   = projectName;

    this.expirationDate = new Date(accessModel.createdAt).valueOf() + 1000*accessModel.ttl;
    console.log(this.uuid, "Starting SSE connection from ", projectName, "with token:", accessToken);

    // A HTTP connection times out after 2 minutes. To avoid this, we send keep alive messages every 30 seconds
    this.keepAliveTimer = setInterval(() => {
      if (this.isTokenExpired()) { return; }

      let pingEvent = { type:"ping",counter: this.count++ }
      this._transmit("data:" + JSON.stringify(pingEvent) + "\n\n");

      // if we are going to use the compression lib for express, we need to flush after a write.
      this.response.flushHeaders();
    }, 30000);

    if (this.isTokenExpired()) { return; }

    // generate a filter based on the scope permissions.
    this.generateFilterFromScope();

    this.request.once('close', () => {
      this.destroy(EventGenerator.getErrorEvent(408, "STREAM_CLOSED", "Event stream has been closed."));
    });

    this.connected = true;
  }


  isTokenExpired() : boolean {
    if (!this._checkIfTokenIsExpired()) { return false; }

    console.info(this.uuid, "Token has expired at", new Date(this.expirationDate).toISOString(), "source:", this.projectName);
    this.destroy(EventGenerator.getErrorEvent(401, "TOKEN_EXPIRED", "Token Expired."));
    return true;
  }


  generateFilterFromScope() {
    this.scopeFilter = generateFilterFromScope(this.accessModel.scopes, this.accessModel.userId);
  }


  destroy(message = "") {
    if (this._destroyed == false) {
      this._destroyed = true;
      console.log(this.uuid, "Destroy message", message);
      this.connected = false;
      clearInterval(this.keepAliveTimer);
      this.request.removeAllListeners();
      this.cleanCallback();

      try {
        this.response.end(message);
      }
      catch (err) {
        console.error("Tried to send a message after ending. Source:", this.projectName);
      }
    }
  }

  dispatch(dataStringified: string, eventData: SseDataEvent) {
    if (this.isTokenExpired()) { return; }

    if (checkScopePermissions(this.scopeFilter, eventData)) {
      this._transmit("data:" + dataStringified + "\n\n");
    }
  }

  _transmit(data : string) {
    this.response.write(data);
    // if we are going to use the compression lib for express, we need to flush after a write.
    this.response.flushHeaders()
  }


  _checkIfTokenIsExpired() : boolean {
    return new Date().valueOf() >= this.expirationDate;
  }
}
