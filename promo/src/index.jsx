import { Composition, registerRoot } from 'remotion';
import { Promo, PROMO_FRAMES } from './Promo.jsx';

function Root() {
  return (
    <>
      <Composition id="Vertical" component={Promo} durationInFrames={PROMO_FRAMES} fps={30} width={1080} height={1920} />
      <Composition id="Landscape" component={Promo} durationInFrames={PROMO_FRAMES} fps={30} width={1920} height={1080} />
    </>
  );
}

registerRoot(Root);
