export interface Outcome {
    name: string;
    price: number;
}

export interface Market {
    key: string;
    outcomes: Outcome[];
}

export interface Bookmaker {
    key: string;
    title: string;
    markets: Market[];
}

export interface OddsResponse {
    id: string;
    sport_key: string;
    sport_title: string;
    commence_time: string;
    home_team: string;
    away_team: string;
    bookmakers: Bookmaker[];
}

export interface Sport {
    key: string;
    group: string;
    title: string;
    description: string;
    active: boolean;
    has_outrights: boolean;
}
