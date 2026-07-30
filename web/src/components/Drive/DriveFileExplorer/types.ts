export interface DriveNode {
    id: string
    name: string
    mimeType?: string
    type?: 'folder' | 'file'
    thumbnailLink?: string
    webViewLink?: string
    modifiedTime?: string
    createdTime?: string
    size?: number
}

export interface SelectedItem {
    id: string
    name: string
    type: 'folder' | 'file'
    url?: string
    thumbnailUrl?: string
}
