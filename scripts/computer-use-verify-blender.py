import bpy
import json

cube = bpy.data.objects.get('Cube')
print('AGENT_CONTROL_SCENE=' + json.dumps({
    'filepath': bpy.data.filepath,
    'location': list(cube.location) if cube else None,
    'scale': list(cube.scale) if cube else None,
    'objects': sorted(obj.name for obj in bpy.data.objects),
}))
