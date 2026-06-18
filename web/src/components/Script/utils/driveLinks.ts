export interface DriveLink {
    id: string;
    name: string;
    link: string;
    parentId?: string;
    language?: string;
    createdAt: number;
    updatedAt: number;
}

export interface NewLinkForm {
    name: string;
    link: string;
    parentId: string;
    language: string;
}

export const initialNewLinkForm: NewLinkForm = {
    name: '',
    link: '',
    parentId: '',
    language: '',
};
