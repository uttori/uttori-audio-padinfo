declare module "audio-padinfo" {
    export = AudioPadInfo;
    class AudioPadInfo {
        static fromFile(data: Buffer): AudioPadInfo;
        static fromBuffer(buffer: any): AudioPadInfo;
        static encodePad(data?: Pad): Buffer;
        static checkDefault(pad: Pad, strict?: boolean): boolean;
        static getPadLabel(index: number): string;
        static getPadIndex(label?: string): number;
        constructor(list: any, overrides?: {
            size: number;
        });
        pads: any[];
        parse(): void;
    }
    namespace AudioPadInfo {
        export { Pad };
    }
    type Pad = {
        avaliable: boolean;
        label: string;
        filename: string;
        originalSampleStart: number;
        originalSampleEnd: number;
        userSampleStart: number;
        userSampleEnd: number;
        volume: number;
        lofi: boolean;
        loop: boolean;
        gate: boolean;
        reverse: boolean;
        format: string;
        channels: number;
        tempoMode: string;
        originalTempo: number;
        userTempo: number;
    };
}
declare module "index" {
    export { AudioPadInfo };
    import AudioPadInfo = require("audio-padinfo");
}
