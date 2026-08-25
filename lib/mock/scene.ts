export interface SceneState {
  gulshanOutage: boolean;
  forceUnpaidBill: boolean;
  /** Skip CID ask — ANI matches pitch customer AIT-100234. Default off. */
  aniKnown: boolean;
}

const scene: SceneState = {
  gulshanOutage: true,
  forceUnpaidBill: true,
  aniKnown: false,
};

export function getScene(): SceneState {
  return { ...scene };
}

export function setScene(partial: Partial<SceneState>): SceneState {
  if (partial.gulshanOutage !== undefined) {
    scene.gulshanOutage = partial.gulshanOutage;
  }
  if (partial.forceUnpaidBill !== undefined) {
    scene.forceUnpaidBill = partial.forceUnpaidBill;
  }
  if (partial.aniKnown !== undefined) {
    scene.aniKnown = partial.aniKnown;
  }
  return getScene();
}

export function resetScene(): SceneState {
  scene.gulshanOutage = true;
  scene.forceUnpaidBill = true;
  scene.aniKnown = false;
  return getScene();
}
