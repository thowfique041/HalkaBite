import { EventEmitter } from 'events';

const featuredFoodEventEmitter = new EventEmitter();
featuredFoodEventEmitter.setMaxListeners(1000);

export const publishFeaturedFoodChanged = () => featuredFoodEventEmitter.emit('changed');
export default featuredFoodEventEmitter;
