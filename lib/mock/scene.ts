export interface SceneState {
  gulshanOutage: boolean;
  forceUnpaidBill: boolean;
}

const scene: SceneState = {
  gulshanOutage: true,
  forceUnpaidBill: true,
};

export function getScene(): SceneState {
  return { ...scene };
}

export function setScene(partial: Partial<SceneState>): SceneState {
  Object.assign(scene, partial);
  return getScene();
}

export function resetScene(): SceneState {
  scene.gulshanOutage = true;
  scene.forceUnpaidBill = true;
  return getScene();
}
