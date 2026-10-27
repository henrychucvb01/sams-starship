import { GameEngine as Engine } from '../src/engine';
import type { GameState } from '../src/engine';
/** Legacy action regression fixtures explicitly complete the new free setup step. */
export class GameEngine extends Engine {
 override startMission(...args: Parameters<Engine['startMission']>):GameState {
  super.startMission(...args);
  const s=this.getGameState();
  const blue=s.startingInformationChoices.at(-1);
  if(blue)this.chooseStartingInformation(blue);
  while(this.getGameState().phase==='startingInformation')this.advanceAI();
  return this.getGameState();
 }
}
