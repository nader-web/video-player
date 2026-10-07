// Production bundle entry.
//
// `video.js` registers <video-player>/<video-skin> as a side effect and must
// execute first; `main.js` then reads the query string and points the media
// element at its source. One bundle = execution order is guaranteed.
import "../vendor/videojs/video.js";
import "./main.js";
