import { CloudinaryImage } from '@cloudinary/url-gen';
import { Node } from './forceGraphTypes';

export interface User {
    id?: string;
    name: string;
    firstName?: string;
    lastName?: string;
    email: string;
    pictureUrl?: string;
    isGridViewOn?: boolean;
    role?: string;

    score?: number;
    cloudinaryImage?: CloudinaryImage;
}

export interface Symbiocreation {
    id?: string;
    name: string;
    place?: string;
    dateTime?: Date;
    timeZone?: string;
    hasStartTime?: boolean;

    description?: string;
    infoUrl?: string;
    tags?: string[];
    extraUrls?: string[];
    sdgs?: string[];
    imgPublicId?: string; // portada (public_id de Cloudinary)

    lastModified?: Date;
    enabled?: boolean;
    visibility?: string;
    participants?: Participant[];
    graph?: Node[];
    nparticipants?: number;

    participantsToDisplay?: Participant[];
    coverUrl?: string; // transitorio: URL de la portada resuelta desde imgPublicId (para las tarjetas)
}

export interface Participant {
    u_id: string;
    user?: User;
    isModerator: boolean;
}

export interface Idea {
    title?: string;
    description?: string;
    lastModified?: Date;
    imgPublicIds?: string[];
    externalUrls?: string[];
    comments?: Comment[];
    cloudinaryImages?: CloudinaryImage[];
}

export interface Comment {
    u_id: string;
    author?: User;
    content: string;
    lastModified?: Date;
}

export interface IdeaAI {
    title: string;
    description: string;
    // true = mensaje informativo (p. ej. "se necesitan más ideas"), NO una idea real. No debe ser accionable.
    placeholder?: boolean;
}

export interface TrendAI {
    topic: string;
    description: string;
}