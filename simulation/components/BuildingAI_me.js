/**
 * Start the build process for the given target
 */
BuildingAI.prototype.Repair = function(target)
{
	//var cmpIdentity = Engine.QueryInterface(this.entity, IID_Identity);
	//warn("BuildingAI Repair: builder entity " + cmpIdentity.GetGenericName());

	// Create a new timer for each target building
	var cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
	cmpTimer.SetInterval(this.entity, IID_BuildingAI, "PerformBuilding", 1000, 1000, target);
};

BuildingAI.prototype.PerformBuilding = function(target, lateness, timerId)
{
	// Check if the target is a foundation
	var cmpFoundation = Engine.QueryInterface(target, IID_Foundation);
	if (!cmpFoundation)
	{
		let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
		cmpTimer.CancelTimer(timerId);
		//warn("BuildingAI PerformBuilding: timer cancelled");
		return;
	}

	var cmpBuilder = Engine.QueryInterface(this.entity, IID_Builder);
	cmpBuilder.PerformBuilding(target);
};
