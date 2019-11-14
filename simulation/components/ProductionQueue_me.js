/*
 * Returns batch build time.
 */
ProductionQueue.prototype.GetBatchTime = function(batchSize)
{
	var cmpPlayer = QueryOwnerInterface(this.entity);

	var batchTimeModifier = ApplyValueModificationsToEntity("ProductionQueue/BatchTimeModifier", +this.template.BatchTimeModifier, this.entity);

	// TODO: work out what equation we should use here.
	return Math.pow(batchSize, batchTimeModifier) * cmpPlayer.GetCheatTimeMultiplier();
};
