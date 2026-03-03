export const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
};

export const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('zh-TW', {
        style: 'currency',
        currency: 'TWD',
        minimumFractionDigits: 0
    }).format(amount);
};

export const getProjectStats = (project: any, tasks: any[], timeLogs: any[] = [], precomputedMinutes?: number) => {
    // 優先順序：
    // 1. precomputedMinutes (通常在詳情頁即時加總 task.totalMinutes)
    // 2. tasks (列表加總)
    // 3. project.totalMinutes (專案文件中的快取欄位)
    // 4. project.totalTime (舊有的手動時數紀錄)

    let loggedHours = 0;
    if (precomputedMinutes !== undefined) {
        loggedHours = precomputedMinutes / 60;
    } else if (tasks && tasks.length > 0) {
        const projectTasks = tasks[0]?.projectId ? tasks.filter(t => t.projectId === project?.id) : tasks;
        const totalMinutes = projectTasks.reduce((acc, task) => acc + (task.totalMinutes || 0), 0);
        loggedHours = totalMinutes / 60;
    } else if (project?.totalMinutes !== undefined) {
        loggedHours = project.totalMinutes / 60;
    } else if (project?.totalTime !== undefined) {
        loggedHours = Number(project.totalTime) || 0;
    }

    if (!project) return {
        loggedHours: 0,
        expectedHours: 0,
        progressPercent: 0,
        isOvertime: false,
        actualRate: 0,
        totalPaid: 0,
        remainingBalance: 0
    };

    const expectedHours = project.totalBudget / (project.targetRate || 1);
    const progressPercent = Math.min((loggedHours / (expectedHours || 1)) * 100, 100);
    const isOvertime = expectedHours > 0 && loggedHours > expectedHours;
    const actualRate = loggedHours > 0 ? project.totalBudget / loggedHours : 0;

    const totalPaid = (project.payments || []).reduce((acc: number, p: any) => acc + p.amount, 0);
    const remainingBalance = project.totalBudget - totalPaid;

    return {
        loggedHours,
        expectedHours,
        progressPercent,
        isOvertime,
        actualRate,
        totalPaid,
        remainingBalance
    };
};

export const getShortId = (id: string) => {
    if (!id) return '';
    return id.slice(-4);
};
