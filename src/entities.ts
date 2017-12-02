interface EntityCreateOptions {
	parent?: entity.TransformInstance;
	transform?: entity.Transform;
	rigidBody?: physics.RigidBodyDescriptor;
	geom?: geometry.Geometry;
	renderer?: entity.MeshRendererDescriptor;
	light?: entity.Light;
}

const geomsToAllocate: geometry.Geometry[] = [];

interface EntityInfo {
	entity: entity.Entity;
	transform: entity.TransformInstance;
	collider: entity.ColliderInstance;
	mesh: entity.MeshInstance;
	renderer: entity.MeshRendererInstance;
	light: entity.LightInstance;
}

function makeEntity(scene: sd.Scene, options: EntityCreateOptions): EntityInfo {
	const entity = scene.entities.create();
	const info: EntityInfo = {
		entity,
		transform: scene.transforms.create(entity, options.transform, options.parent),
		collider: 0,
		mesh: 0,
		renderer: 0,
		light: 0
	};

	if (options.geom) {
		const mesh = scene.meshes.create(options.geom);
		scene.meshes.linkToEntity(mesh, entity);
		info.mesh = mesh;
		if (options.geom.renderResourceHandle === 0) {
			geomsToAllocate.push(options.geom);
		}
	}
	if (options.renderer) {
		info.renderer = scene.renderers.create(entity, options.renderer);
	}
	if (options.rigidBody) {
		info.collider = scene.colliders.create(entity, {
			rigidBody: options.rigidBody
		});
	}
	if (options.light) {
		info.light = scene.lights.create(entity, options.light);
	}

	return info;
}
