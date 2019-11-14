function performGroup(action, groupId)
{
	switch (action)
	{
		case "snap":
		case "select":
		case "add":
			var toSelect = [];
			g_Groups.update();
			for (var ent in g_Groups.groups[groupId].ents)
				toSelect.push(+ent);

			if (action != "add")
				g_Selection.reset();

			g_Selection.addList(toSelect);
			//warn("selectGroup: " + groupId + " / size " + toSelect.length);

			if (toSelect.length)
			{
				let entState = GetEntityState(toSelect[0]);
				let position = entState.position;
				if (position)
				{
					if (action == "snap" && entState.visibility != "hidden")
						Engine.CameraMoveTo(position.x, position.z);
				}
			}
			break;
		case "save":
			let current = g_Groups.groups[groupId].getEntList();
			// Get the units that are currently in the group, but not in the
			// new selection (orphans)
			let orphans = current.filter(x => g_Selection.toList().indexOf(x) < 0);

			// Find an empty group for the orphans (start from Group 9)
			if (orphans.length > 0)
			{
				warn("  orphans: " + orphans.length);

				for (var i = 9; i >= 0; --i)
					if (g_Groups.groups[i].getTotalCount() == 0)
					{
						// Assign the orphans to this group
						g_Groups.addEntities(i, orphans);

						// Save the new selection to the requested group
						g_Groups.groups[groupId].reset();
						g_Groups.addEntities(groupId, g_Selection.toList());
						break;
					}
			}
			else
			{
				g_Groups.groups[groupId].reset();
				g_Groups.addEntities(groupId, g_Selection.toList());
			}

			updateGroups();
			break;
		case "breakUp":
			// This is not allowed
			//g_Groups.groups[groupId].reset();
			//updateGroups();
			break;
	}
}

function doAction(action, ev)
{
	var selection = g_Selection.toList();

	// If shift is down, add the order to the unit's order queue instead
	// of running it immediately
	var queued = Engine.HotkeyIsPressed("session.queue");
	var target = Engine.GetTerrainAtScreenPoint(ev.x, ev.y);

	if (unitActions[action.type] && unitActions[action.type].execute)
	{
		// All actions should be executed on a per-group basis, so that
		// the groups can move and attack together
		var clusters = g_Groups.clusterEntitiesByGroup(selection);

		for (let cluster of clusters)
		{
			unitActions[action.type].execute(target, action, cluster, queued);
		}
		return true;
	}
	error("Invalid action.type "+action.type);
	return false;
}

/**
 * Returns the number of units that will be present in a batch if the user clicks
 * the training button with shift down
 */
function getTrainingBatchStatus(playerState, trainEntType, selection)
{
	let batchIncrementSize = +Engine.ConfigDB_GetValue("user", "gui.session.batchtrainingsize");
	var trainingGroups = [];
	if (selection)
		trainingGroups = getBatchTrainingGroups(selection, trainEntType);
	var nextBatchTrainingCount = 0;
	var currentBatchTrainingCount = 0;

	var limits;
	if (inputState == INPUT_BATCHTRAINING && batchTrainingType == trainEntType)
	{
		nextBatchTrainingCount = batchTrainingCount;
		currentBatchTrainingCount = batchTrainingCount;
		limits = {
			"canBeAddedCount": batchTrainingEntityAllowedCount
		};
	}
	else
		limits = getEntityLimitAndCount(playerState, trainEntType);

	// We need to calculate count after the next increment if it's possible
	if (limits.canBeAddedCount == undefined ||
		limits.canBeAddedCount > nextBatchTrainingCount * trainingGroups.length)
		nextBatchTrainingCount += batchIncrementSize;

	// If training limits don't allow us to train batchTrainingCount in each appropriate building
	// train as many full batches as we can and remainer in one more building.
	var buildingsCountToTrainFullBatch = trainingGroups.length;
	var remainderToTrain = 0;
	if (limits.canBeAddedCount !== undefined &&
	    limits.canBeAddedCount < nextBatchTrainingCount * trainingGroups.length)
	{
		buildingsCountToTrainFullBatch = Math.floor(limits.canBeAddedCount / nextBatchTrainingCount);
		remainderToTrain = limits.canBeAddedCount % nextBatchTrainingCount;
	}

	return [buildingsCountToTrainFullBatch, nextBatchTrainingCount, remainderToTrain, currentBatchTrainingCount];
}

function getBatchTrainingGroups(selection, trainEntType)
{
	if (selection.length)
	{
		var st = GetEntityState(selection[0]);
		//warn("getBatchTrainingGroups: selection[0] " + st.template);
		//warn("  someUnitAI: " + someUnitAI(selection));
	}

	if (someUnitAI(selection))
	{
		var clusters = g_Groups.clusterEntitiesByGroup(selection, true);
		//warn("  clusters: " + clusters.length);
		if (clusters.length)
			return clusters;
	}

	return selection.filter(entity => {
		var state = GetEntityState(entity);
		var canTrain = state && state.production && state.production.entities.length &&
			state.production.entities.indexOf(trainEntType) != -1;
		return canTrain;
	});
}

function getBuildingsWhichCanTrainEntity(selection, trainEntType)
{
	if (selection.length)
	{
		var st = GetEntityState(selection[0]);
		//warn("getBuildingsWhichCanTrainEntity: selection[0] " + st.template);
	}

	if (someUnitAI(selection))
	{
		var clusters = g_Groups.clusterEntitiesByGroup(selection, true);
		//warn("  clusters: " + clusters.length);

		if (clusters.length)
		{
			var buildings = [];
			for (let cluster of clusters)
			{
				var building = Engine.GuiInterfaceCall(
					"FindBuildingToTrainEntity", {
						"searchEntity": cluster[0],
						"trainEntity": trainEntType
					});
				if (building)
					buildings.push(building);
			}

			if (buildings.length)
				return buildings;
		}
	}

	return selection.filter(entity => {
		var state = GetEntityState(entity);
		var canTrain = state && state.production && state.production.entities.length &&
			state.production.entities.indexOf(trainEntType) != -1;
		return canTrain;
	});
}
