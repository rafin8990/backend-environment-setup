export type IRole={
    id?:number;
    title:string;
    description?:string;
    permission_ids:number[];
    created_at?:Date;
    updated_at?:Date;
}

export type IRolePermission={
    role_id:number;
    permission_id:number;
}