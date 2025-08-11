import { LocalizationManager } from '../localization/LocalizationManager';

export const GAME_CONFIG = {
    BRUSH_SIZE_BASE: 42,
    MIN_BRUSH_SIZE: 8,
    MIN_PREVIEW_SIZE: 6,
    
    PROGRESS_BAR_HEIGHT: 20,
    PROGRESS_BAR_MARGIN: 40,
    PROGRESS_BAR_OFFSET: 15,
    
    SCREEN_MARGIN: 10,
    BG_SCALE_EXTRA: 1.01,
    
    MIN_MOVEMENT_DISTANCE: 1.5,
    MOUSE_DELTA_THRESHOLD: 2,
    SNAP_DISTANCE: 30,
    COVERAGE_RADIUS: 8,
    
    NEAR_DRAWABLE_DISTANCE: 32,
    
    INTERSECTION_EPSILON: 1e-9,
    SKIP_RECENT_SEGMENTS: 3,
    
    GRID_SIZE: 50,
    
    TEXTURE_REFRESH_DELAY: 16,
    
    SKELETON_TOLERANCE: 2.5,
    MIN_SEGMENT_LENGTH: 5,
    MIN_POLYLINE_LENGTH: 5,
    ALPHA_THRESHOLD: 128,
    SMALL_HOLE_THRESHOLD: 6,
    
    OVERLAY_ANIMATION_DURATION: 300,
    CONFETTI_COUNT: 40,
    CONFETTI_FALL_DURATION: 250,
    SUCCESS_OVERLAY_DURATION: 2000,
    FAILURE_OVERLAY_DURATION: 500,
    NEXT_IMAGE_DELAY: 3000,
    
    COMPLETION_THRESHOLD: 99,
    GREEN_PIXEL_THRESHOLD: 200,
    NON_GREEN_THRESHOLD: 100,
    
    INSTALL_BUTTON_MAX_WIDTH: 150,
    INSTALL_BUTTON_MARGIN: 20,
    INSTALL_BUTTON_FONT_SIZE: 20,
    
    TITLE_TOP_MARGIN: 30,
    TITLE_FONT_SIZE: 32,
    SUBTITLE_FONT_SIZE: 18,
    SUBTITLE_OFFSET: 45,
    
    PROGRESS_FONT_SIZE: 14,
    
    IMAGE_SCALE_FACTOR: 0.8
};

export const COLORS = {
    DRAWING_GREEN: 0x00ff00,
    DRAWING_GREEN_RGB: { r: 0, g: 255, b: 0 },
    
    PROGRESS_BG: 0x333333,
    PROGRESS_BORDER: 0xFFFFFF,
    TEXT_WHITE: '#ffffff',
    TEXT_BLACK: '#000000',
    TEXT_RED: '#ff0000',
    TEXT_GREEN: '#00ff00',
    TEXT_GRAY: '#cccccc',
    
    OVERLAY_BACKGROUND: 0x000000,
    OVERLAY_ALPHA: 0.7,
    
    PREVIEW_GREEN: 0x00ff00,
    PREVIEW_ALPHA: 0.7,
    SKELETON_COLOR: 0x000000,
    
    CONFETTI_COLORS: [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf9ca24, 0xf0932b, 0xeb4d4b, 0x6c5ce7, 0xa29bfe]
};

export const DRAWING_OBJECTS = ['potion-bottle', 'table-lamp', 'ship', 'topuklu'];

export const TEXTURE_ATLAS = {
    KEY: 'texture',
    PATH: 'assets/images/texture.png',
    JSON_PATH: 'assets/images/texture.json'
};

export const ASSET_PATHS = {
    DRAWING_OBJECTS: {
        'potion-bottle': 'assets/drawingObjects/potion-bottle.png',
        'ship': 'assets/drawingObjects/ship.png',
        'table-lamp': 'assets/drawingObjects/table-lamp.png',
        'topuklu': 'assets/drawingObjects/topuklu.png'
    }
};

export const ATLAS_FRAMES = {
    BG1: 'drawing-bg1.jpg',
    BG2: 'drawing-bg2.png',
    INSTALL_BTN: 'installBtn.png',
    FAIL_IMAGE: 'fail.jpg',
    SUCCESS_IMAGE: 'wellDone.jpg'
};

// Get localization instance
const localization = LocalizationManager.getInstance();

export const MESSAGES = {
    TITLE: localization.getText('title'),
    SUBTITLE: localization.getText('subtitle'),
    INSTALL_BUTTON: localization.getText('install_button'),
    GAME_COMPLETED: 'Game completed! 99% of shape painted.',
    DRAWING_INITIALIZED: 'Drawing system initialized with skeleton path-constrained drawing',
    MOUSE_UP_RESET: 'Mouse up detected - resetting game (one line drawing rule)',
    LINE_INTERSECTION: 'Line intersection detected! Resetting...',
    MOUSE_OFF_PATH: 'Mouse left valid drawing path - resetting game',
    MOUSE_NOT_ON_PATH: 'Mouse not on valid drawing path',
    DRAWING_DISABLED: 'Game completed - drawing disabled'
};