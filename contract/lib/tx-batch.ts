export type TTransaction = {
    to: string;
    value: string;
    data: string;
    transactionInfoLog: string;
};
/**
 * This is a global to capture the results of tasks when composing multiple tasks
 * for signing and proposal in a single batch. Hardhat tasks do not return values,
 * so we need this hack to combine the results of multiple tasks in a single
 * composite task.
 * */
export const transactionBatch: TTransaction[] = [];