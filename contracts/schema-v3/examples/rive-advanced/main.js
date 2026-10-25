// Source example: add main.riv, preview.webp and assets/scene.riv before packaging.
// Names are queried from the actual secondary file instead of invented.
let ownedWorker = null;
let ownedFiles = [];
let lastFrame = null;

async function releaseObjects() {
  lastFrame = null;
  const files = ownedFiles;
  ownedFiles = [];
  const worker = ownedWorker;
  ownedWorker = null;
  try {
    await Promise.all(files.map(file => file.close()));
  } finally {
    if (worker) await worker.close();
  }
}

defineResourcePackage({
  async activate(qu) {
    if (!qu.rive.files || !qu.rive.workers) throw new Error('This client has no advanced Rive objects API');
    const caps = await qu.rive.files.capabilities();
    if (!caps.sharedWorkerFiles || !caps.offscreenRender) throw new Error('Required native Rive capabilities are unavailable');
    try {
      ownedWorker = await qu.rive.workers.create({enableGPUCanvas: true});
      const first = await ownedWorker.open('assets/scene.riv');
      ownedFiles.push(first);
      const second = await qu.rive.files.open('assets/scene.riv', {worker: ownedWorker});
      ownedFiles.push(second);
      const names = await second.artboardNames();
      if (!names.length) throw new Error('The secondary Rive file has no artboard');
      const board = await second.createArtboard(names[0]);
      const machines = await board.stateMachineNames();
      if (!machines.length) throw new Error('The selected artboard has no state machine');
      const state = await board.createStateMachine(machines[0]);
      await state.setFit({fit: 'contain', alignment: 'center'});
      await state.advance(1 / 60);
      // pixels are native rgba8/bgra8 bytes, not an encoded image.
      lastFrame = await state.render({width: 256, height: 256});
      if (lastFrame.skipped) lastFrame = null;
      await ownedWorker.close();
      ownedWorker = null; // Files retain the real Worker; no new opens through the released owner.
      await first.close();
      ownedFiles = [second]; // The other file on the same Worker continues to work.
    } catch (error) {
      await releaseObjects();
      throw error;
    }
  },
  async deactivate() {
    await releaseObjects();
  }
});
