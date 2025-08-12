import { PreveraSecConfig } from '../types/AppSpec';
/**
 * PreveraSec Server
 * Web interface and API for continuous monitoring
 */
export declare class PreveraSecServer {
    private logger;
    private config;
    constructor(config: PreveraSecConfig);
    /**
     * Start the server
     */
    start(port: number): Promise<void>;
    /**
     * Stop the server
     */
    stop(): Promise<void>;
}
//# sourceMappingURL=PreveraSecServer.d.ts.map