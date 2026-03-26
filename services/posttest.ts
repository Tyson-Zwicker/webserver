
interface ServiceResult {
    data: string;
    returnCode: number;
}

let postBody = '';

process.on('message', (message: unknown) => {
    const msg = `${message ?? ''}`;

    if (msg === 'SIGINT') {
        terminate();
        return;
    }

    if (msg.startsWith('BODY')) {
        postBody = msg.substring(4);
        return;
    }

    if (msg.startsWith('RUN')) {
        returnService(`[Data returned from service][${postBody}]`);
    }
});

function returnService(data: string): void {
    const result: ServiceResult = {
        data,
        returnCode: 200,
    };
    process.send?.(JSON.stringify(result));
}

function terminate(): never {
    process.exit(0);
}