# Dog model asset

Place the licensed dog model at `public/models/dogs/rescue-dog.glb`.

The game loads one GLB and creates black, golden, brown, and spotted material
variants from it. Include a looping walk or run animation clip in the GLB; the
loader selects a clip whose name contains `walk` or `run`, or uses the first
available animation. The model should face local +Z and have its feet near the
ground plane. The renderer normalizes its size and enables cast/receive shadows.
