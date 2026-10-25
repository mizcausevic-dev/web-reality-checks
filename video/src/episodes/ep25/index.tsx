import tl from './timeline.json';
import {makeEpisode, Timeline} from '../../kit/Episode';
import {scenes} from './Scenes';
export {scenes};
export const timeline = tl as Timeline;
export const Episode = makeEpisode(timeline, scenes);
