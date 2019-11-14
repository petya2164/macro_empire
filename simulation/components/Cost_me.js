Cost.prototype.GetBuildTime = function()
{
	var cmpPlayer = QueryOwnerInterface(this.entity);
	var buildTime = (+this.template.BuildTime) * cmpPlayer.cheatTimeMultiplier;
	return ApplyValueModificationsToEntity("Cost/BuildTime", buildTime, this.entity);
};
