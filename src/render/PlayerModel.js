// Spielerfigur – dünne Sammeldatei: die Teile liegen in render/player/ (atlas, geometry, model, poses, keeper, gestures, animate).
// Alle bisherigen Exporte bleiben unverändert hier erreichbar.
export { BONES, REF_BONES } from './player/bones.js';
export { EDGE_CODE, FACE_PARTS, FACES, faceArt, faceFeatures, KitAtlas } from './player/atlas.js';
export { boxGeometry } from './player/geometry.js';
export { createPlayerModel, disposeKit, setFace, setKitDirt, setKitWet } from './player/model.js';
export { ACTS, BUCH_L, BUCH_R, DEHNEN, DOSE, GRIP, IN_REL_AT, KARTE, PUNKT, REKLAMIEREN, TRINKEN, TROESTEN, UNSCHULD, VORTEIL } from './player/poses.js';
export { animatePlayer, posePlayer } from './player/animate.js';
