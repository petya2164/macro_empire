// Override the original repair command
var superRepair = g_Commands["repair"];

g_Commands["repair"] = function(player, cmd, data)
{
	superRepair(player, cmd, data);

	// The build command was given to a single building
	if (data.entities.length == 1)
	{
		var cmpBuildingAI = Engine.QueryInterface(data.entities[0], IID_BuildingAI);
		if (cmpBuildingAI)
			cmpBuildingAI.Repair(cmd.target);
	}
};

g_Commands["walk"] = function(player, cmd, data)
{
	GetFormationUnitAIs(data.entities, player).forEach(cmpUnitAI => {
		cmpUnitAI.Walk(cmd.x, cmd.z, cmd.queued);
	});
};

g_Commands["formation"] = function(player, cmd, data)
{
	GetFormationUnitAIs(data.entities, player, cmd.name).forEach(cmpUnitAI => {
		cmpUnitAI.MoveIntoFormation(cmd);
	});
};

/**
 * Returns a list of UnitAI components, each belonging either to a
 * selected unit or to a formation entity for groups of the selected units.
 */
function GetFormationUnitAIs(ents, player, formationTemplate)
{
	warn("GetFormationUnitAIs override");

	// If an individual was selected, remove it from any formation
	// and command it individually
	if (ents.length == 1)
	{
		// Skip unit if it has no UnitAI
		var cmpUnitAI = Engine.QueryInterface(ents[0], IID_UnitAI);
		if (!cmpUnitAI)
			return [];

		RemoveFromFormation(ents);
		warn("return single UnitAI");
		return [ cmpUnitAI ];
	}

	// Separate out the units that don't support the chosen formation
	var formedEnts = [];
	var nonformedUnitAIs = [];
	for (let ent of ents)
	{
		// Skip units with no UnitAI or no position
		var cmpUnitAI = Engine.QueryInterface(ent, IID_UnitAI);
		var cmpPosition = Engine.QueryInterface(ent, IID_Position);
		if (!cmpUnitAI || !cmpPosition || !cmpPosition.IsInWorld())
			continue;

		var cmpIdentity = Engine.QueryInterface(ent, IID_Identity);
		// TODO: We only check if the formation is usable by some units
		// if we move them to it. We should check if we can use formations
		// for the other cases.
		var nullFormation = (formationTemplate || cmpUnitAI.GetFormationTemplate()) == "special/formations/null";
		if (!nullFormation && cmpIdentity && cmpIdentity.CanUseFormation(formationTemplate || "special/formations/null"))
			formedEnts.push(ent);
		else
		{
			if (nullFormation)
				RemoveFromFormation([ent]);

			nonformedUnitAIs.push(cmpUnitAI);
		}
	}
	warn("nonformed: " + nonformedUnitAIs.length + " / formed: " + formedEnts.length);

	if (formedEnts.length == 0)
	{
		// No units support the foundation - return all the others
		return nonformedUnitAIs;
	}

	// Find what formations the formationable selected entities are currently in
	var formation = ExtractFormations(formedEnts);

	var formationUnitAIs = [];
	if (formation.ids.length == 1)
	{
		// Selected units either belong to this formation or have no formation
		// Check that all its members are selected
		var fid = formation.ids[0];
		var cmpFormation = Engine.QueryInterface(+fid, IID_Formation);
		if (cmpFormation && cmpFormation.GetMemberCount() == formation.members[fid].length
			&& cmpFormation.GetMemberCount() == formation.entities.length)
		{
			warn("return single formationUnitAI / units: " + cmpFormation.GetMemberCount());
			cmpFormation.DeleteTwinFormations();
			// The whole formation was selected, so reuse its controller for this command
			formationUnitAIs = [Engine.QueryInterface(+fid, IID_UnitAI)];
			if (formationTemplate && CanMoveEntsIntoFormation(formation.entities, formationTemplate))
				cmpFormation.LoadFormation(formationTemplate);
		}
	}

	if (formationUnitAIs.length == 0)
	{
		// We need to give the selected units a new formation controller

		// TODO replace the fixed 60 with something sensible, based on vision range f.e.
		var formationSeparation = 60;
		var clusters = ClusterEntities(formation.entities, formationSeparation);
		var formationEnts = [];
		for (let cluster of clusters)
		{
			if (!formationTemplate || !CanMoveEntsIntoFormation(cluster, formationTemplate))
			{
				// Use the last formation template if everyone was using it
				var lastFormationTemplate = undefined;
				for (let ent of cluster)
				{
					var cmpUnitAI = Engine.QueryInterface(ent, IID_UnitAI);
					if (cmpUnitAI)
					{
						var template = cmpUnitAI.GetFormationTemplate();
						if (lastFormationTemplate === undefined)
						{
							lastFormationTemplate = template;
						}
						else if (lastFormationTemplate != template)
						{
							lastFormationTemplate = undefined;
							break;
						}
					}
				}
				if (lastFormationTemplate && CanMoveEntsIntoFormation(cluster, lastFormationTemplate))
					formationTemplate = lastFormationTemplate;
				else
					formationTemplate = "special/formations/null";
			}

			RemoveFromFormation(cluster);

			if (formationTemplate == "special/formations/null")
			{
				for (let ent of cluster)
					nonformedUnitAIs.push(Engine.QueryInterface(ent, IID_UnitAI));

				continue;
			}

			// Create the new controller
			var formationEnt = Engine.AddEntity(formationTemplate);
			var cmpFormation = Engine.QueryInterface(formationEnt, IID_Formation);
			formationUnitAIs.push(Engine.QueryInterface(formationEnt, IID_UnitAI));
			cmpFormation.SetFormationSeparation(formationSeparation);
			cmpFormation.SetMembers(cluster);

			warn("new cluster: " + formationTemplate + " / units: " + cluster.length);

			for (let ent of formationEnts)
				cmpFormation.RegisterTwinFormation(ent);

			formationEnts.push(formationEnt);
			var cmpOwnership = Engine.QueryInterface(formationEnt, IID_Ownership);
			cmpOwnership.SetOwner(player);
		}
	}

	return nonformedUnitAIs.concat(formationUnitAIs);
}


/**
 * Remove the given list of entities from their current formations.
 */
function RemoveFromFormation(ents)
{
	var formation = ExtractFormations(ents);
	for (var fid in formation.members)
	{
		var cmpFormation = Engine.QueryInterface(+fid, IID_Formation);
		if (cmpFormation)
			cmpFormation.RemoveMembers(formation.members[fid]);
	}
}

/**
 * Get some information about the formations used by entities.
 * The entities must have a UnitAI component.
 */
function ExtractFormations(ents)
{
	var entities = []; // subset of ents that have UnitAI
	var members = {}; // { formationentity: [ent, ent, ...], ... }
	for (let ent of ents)
	{
		var cmpUnitAI = Engine.QueryInterface(ent, IID_UnitAI);
		var fid = cmpUnitAI.GetFormationController();
		if (fid != INVALID_ENTITY)
		{
			if (!members[fid])
				members[fid] = [];
			members[fid].push(ent);
		}
		entities.push(ent);
	}

	var ids = [ id for (id in members) ];

	return { "entities": entities, "members": members, "ids": ids };
}

/**
 * Cluster a list of entities based on their army groups
 */
//function ClusterGroupedEntities(ents, separationDistance)
//{
//	var clusters = [];
//	if (!ents.length)
//		return clusters;

//	// Copy the original ents list, this will be modified here
//	var remainingEnts = ents.slice();

//	for (var i = 0; i < 10; ++i)
//	{
//		let group = g_Groups.groups[i].getEntList();
//		// Get the selected entities that are in this group
//		let selected = group.filter(x => remainingEnts.indexOf(x) >= 0);

//		if (selected.length)
//		{
//			clusters.push(selected);
//			// Only keep the entities that are not in selected
//			remainingEnts = remainingEnts.filter(x => selected.indexOf(x) < 0);
//		}
//	}

//	// The non-grouped entities will be clustered using the original logic
//	return clusters.concat(ClusterEntities(remainingEnts, separationDistance));
//}

/**
 * Group a list of entities in clusters via single-links
 */
function ClusterEntities(ents, separationDistance)
{
	var clusters = [];
	if (!ents.length)
		return clusters;

	var distSq = separationDistance * separationDistance;
	var positions = [];
	// triangular matrix with the (squared) distances between the different clusters
	// the other half is not initialised
	var matrix = [];
	for (let i = 0; i < ents.length; ++i)
	{
		matrix[i] = [];
		clusters.push([ents[i]]);
		var cmpPosition = Engine.QueryInterface(ents[i], IID_Position);
		positions.push(cmpPosition.GetPosition2D());
		for (let j = 0; j < i; ++j)
			matrix[i][j] = positions[i].distanceToSquared(positions[j]);
	}
	while (clusters.length > 1)
	{
		// search two clusters that are closer than the required distance
		var closeClusters = undefined;

		for (var i = matrix.length - 1; i >= 0 && !closeClusters; --i)
			for (var j = i - 1; j >= 0 && !closeClusters; --j)
				if (matrix[i][j] < distSq)
					closeClusters = [i,j];

		// if no more close clusters found, just return all found clusters so far
		if (!closeClusters)
			return clusters;

		// make a new cluster with the entities from the two found clusters
		var newCluster = clusters[closeClusters[0]].concat(clusters[closeClusters[1]]);

		// calculate the minimum distance between the new cluster and all other remaining
		// clusters by taking the minimum of the two distances.
		var distances = [];
		for (let i = 0; i < clusters.length; ++i)
		{
			if (i == closeClusters[1] || i == closeClusters[0])
				continue;
			var dist1 = matrix[closeClusters[1]][i] || matrix[i][closeClusters[1]];
			var dist2 = matrix[closeClusters[0]][i] || matrix[i][closeClusters[0]];
			distances.push(Math.min(dist1, dist2));
		}
		// remove the rows and columns in the matrix for the merged clusters,
		// and the clusters themselves from the cluster list
		clusters.splice(closeClusters[0],1);
		clusters.splice(closeClusters[1],1);
		matrix.splice(closeClusters[0],1);
		matrix.splice(closeClusters[1],1);
		for (let i = 0; i < matrix.length; ++i)
		{
			if (matrix[i].length > closeClusters[0])
				matrix[i].splice(closeClusters[0],1);
			if (matrix[i].length > closeClusters[1])
				matrix[i].splice(closeClusters[1],1);
		}
		// add a new row of distances to the matrix and the new cluster
		clusters.push(newCluster);
		matrix.push(distances);
	}
	return clusters;
}
