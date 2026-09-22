export class RunningStats {
  private count = 0;
  private runningMean = 0;
  private sumOfSquaredDeviations = 0;

  add(value: number): void {
    this.count += 1;
    const deviationFromPreviousMean = value - this.runningMean;
    this.runningMean += deviationFromPreviousMean / this.count;
    this.sumOfSquaredDeviations += deviationFromPreviousMean * (value - this.runningMean);
  }

  get mean(): number {
    return this.count === 0 ? NaN : this.runningMean;
  }

  get populationStandardDeviation(): number {
    return this.count === 0 ? NaN : Math.sqrt(this.sumOfSquaredDeviations / this.count);
  }
}
