export interface IEnvelopeHistory {
    id?: string;
    envelope_id?: string;
    role_name?: string;
    event: string;
    event_detail?: string;
    created_at: Date;
}

export interface IActivity {
    date: string;
    log: string;
    icon: string;
}
