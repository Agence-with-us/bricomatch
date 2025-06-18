export interface Service {
    id: string;
    name: string;
    imageUrl: string;
}

export interface ServicesState {
    services: Service[];
    loading: boolean;
    error: string | null;
}


