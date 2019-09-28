export interface Payload {
    vaccount: string;
    [data: string]: any;
}

export interface CombinedPayload {
    name: string;
    data: {
        payload: {
            vaccount: string,
            [data: string]: any;
        },
    };
}
