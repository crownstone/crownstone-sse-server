interface EventFilter {
  type?:     "presence"  | "command" | "*" | "all",
  // stoneIds?  : { [key: string]: boolean }, // only get events from this Crownstone
  sphereIds? : { [key: string]: boolean }
}


interface AccessModel {
  accessToken: string,
  ttl: number,
  createdAt: number,
  userId: string,
  spheres: {
    [key: string] : { boolean }
  },
  scopes: string[]
}

type SseEvent = SystemEvent                 |
                  SwitchStateUpdateEvent    |
                  SwitchCrownstoneEvent     |
                  SphereTokensUpdatedEvent  |
                  PresenceSphereEvent       |
                  PresenceLocationEvent     |
                  DataChangeEvent           |
                  AbilityChangeEvent        |
                  InvitationChangeEvent


interface SystemEvent {
  type:    "system",
  subType:  "TOKEN_EXPIRED" | "NO_ACCESS_TOKEN" | "NO_CONNECTION" | "STREAM_START" | "STREAM_CLOSED",
  code:     number,
  message:  string,
}

interface SwitchCrownstoneEvent {
  type:       "command",
  subType:    "switchCrownstone"
  sphere:     SphereData,
  crownstone: CrownstoneData,
}

interface PresenceSphereEvent {
  type:     "presence",
  subType:  "enterSphere" | "exitSphere"
  user:     UserData,
  sphere:   SphereData
}

interface PresenceLocationEvent {
  type:     "presence",
  subType:  "enterLocation" | "exitLocation"
  user:     UserData,
  sphere:   SphereData,
  location: LocationData,
}

interface DataChangeEvent {
  type:        "dataChange",
  subType:     "users"   | "spheres" | "stones" | "locations",
  operation:   "create"  | "delete"  | "update"
  sphere:      SphereData,
  changedItem: NameIdSet,
}

interface SphereTokensUpdatedEvent {
  type:        "sphereTokensChanged",
  subType:     "sphereAuthorizationTokens",
  operation:   "update"
  sphere:      SphereData,
}

interface AbilityChangeEvent {
  type:        "abilityChange",
  subType:     "dimming"   | "switchcraft" | "tapToToggle",
  sphere:      SphereData,
  stone:       CrownstoneData,
  ability:     AbilityData
}

interface InvitationChangeEvent {
  type:        "invitationChange",
  operation:   "invited" | "invitationRevoked"
  sphere:      SphereData,
  email:       string,
}
interface SwitchStateUpdateEvent {
  type:        'switchStateUpdate',
  subType:     'stone',
  sphere:       SphereData,
  crownstone:   CrownstoneData,
}

interface NameIdSet {
  id:   string,
  name: string
}
interface SphereData     extends NameIdSet {
  uid: number
}
interface UserData       extends NameIdSet {}
interface LocationData   extends NameIdSet {}
interface CrownstoneData extends NameIdSet {
  switchState: number | null,
  macAddress: string,
  uid: number,
}

interface AbilityData {
  type: string,
  enabled: boolean,
  syncedToCrownstone: boolean,
}


type RoutingMap = {
  all: ArrayMap,
  presence: ArrayMap,
  command: ArrayMap,
}
type ArrayMap = { [key: string] : string[] }