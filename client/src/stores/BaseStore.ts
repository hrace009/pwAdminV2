import { ClassConstructor, } from "class-transformer";
import { action, makeObservable, observable } from "mobx";
import { BACKEND_ADDRESS } from "../configs/constants";
import { EntityId } from "../models/BaseEntity";

export abstract class BaseStore<T extends { id?: EntityId }> {
    protected backendAddress: string = BACKEND_ADDRESS;
    public endpoint: string = '';
    public entityClass: ClassConstructor<T>;
    public disposers: (() => void)[] = [];
    public items: T[] = [];
    public setItems(items: T[]) { this.items = items; }
    public static defaultHeaders: Map<string, string> = new Map();

    public dispose() {
        this.disposers.forEach(x => x());
    }

    public get defaultHeaders() {
        return BaseStore.defaultHeaders;
    }

    public set defaultHeaders(defaultHeaders: Map<string, string>) {
        BaseStore.defaultHeaders = defaultHeaders;
    }

    public fetch(url: string, init: RequestInit = {} as RequestInit) {
        const headers: Record<string, string> = init.headers as Record<string, string> || {};
        if (this.defaultHeaders.size) { 
            Array.from(this.defaultHeaders.entries()).forEach(([k, v]) => headers[k] = v);
        }
        init.headers = headers;
        if (Object.keys(headers).length === 0) { delete init.headers; }
        return fetch(url, init);
    }

    public async request<R = T>(url: string, init: RequestInit = {} as RequestInit) {
        const result = await this.fetch(url, init);
        const resultJson = await result.json() as ({ data: R } | R);
        const item = (resultJson as { data: R }).data || resultJson as (R);
        return item;
    }

    public async get(id: string): Promise<T> {
        try {
            const item = await this.request(`${this.endpoint}/${id}`);
            return item;
        } catch (err) {
            console.error(err);
            throw new Error(err);
        }
    }

    public async getList(): Promise<T[]> {
        try {
            const items = await this.request<T[]>(this.endpoint);
            this.setItems(items);
            return items;
        } catch (err) {
            console.error(err);
            throw new Error(err);
        }
    }

    public async create(data: T): Promise<T> {
        try {
            const item = await this.request(
                this.endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                }
            );
            this.setItems([ item, ...this.items ]);
            return item;
        } catch(err) {
            console.error(err);
            throw new Error(err);
        }
    }

    public async update(data: T): Promise<T> {
        try {
            const item = await this.request(
                `${this.endpoint}/${data.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                }
            );
            this.setItems([ ...this.items ]);
            return item;
        } catch(err) {
            console.error(err);
            throw new Error(err);
        }
    }

    public onDelete = async (id: number): Promise<void> => {
        try {
            await this.request(
                `${this.endpoint}/${id}`, {
                    method: 'DELETE',
                }
            );
            this.setItems(this.items.filter(item => item.id !== id));
        } catch(err) {
            console.error(err);
            throw new Error(err);
        }
    }

    public wait(ms: number): Promise<void> {
        return new Promise((res, rej) => {
            setTimeout(res, ms);
        });
    }

    public init(): void {}

    constructor(
        endpoint: string,
        entityClass: new () => T
    ) {
        this.endpoint = this.backendAddress + endpoint;
        this.entityClass = entityClass;

        makeObservable(this, {
            items: observable,
            setItems: action.bound
        });
    }
}