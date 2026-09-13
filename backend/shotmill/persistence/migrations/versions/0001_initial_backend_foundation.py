# ruff: noqa
"""initial backend foundation

Revision ID: 0001
Revises:
Create Date: 2026-09-13 08:55:31.129923
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '0001'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('projects',
    sa.Column('id', sa.String(length=80), nullable=False),
    sa.Column('title', sa.String(length=240), nullable=False),
    sa.Column('description', sa.Text(), nullable=False),
    sa.Column('use_description_for_ai_prompt', sa.Boolean(), nullable=False),
    sa.Column('cover_asset_id', sa.String(length=80), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('assets',
    sa.Column('id', sa.String(length=80), nullable=False),
    sa.Column('project_id', sa.String(length=80), nullable=False),
    sa.Column('name', sa.String(length=240), nullable=False),
    sa.Column('original_filename', sa.String(length=500), nullable=False),
    sa.Column('project_relative_path', sa.String(length=1000), nullable=False),
    sa.Column('media_type', sa.String(length=32), nullable=False),
    sa.Column('category', sa.String(length=64), nullable=False),
    sa.Column('tags', sa.JSON(), nullable=False),
    sa.Column('width', sa.Integer(), nullable=True),
    sa.Column('height', sa.Integer(), nullable=True),
    sa.Column('duration', sa.Float(), nullable=True),
    sa.Column('hash', sa.String(length=128), nullable=True),
    sa.Column('thumbnail_path', sa.String(length=1000), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_assets_project_id'), 'assets', ['project_id'], unique=False)
    op.create_table('generation_tasks',
    sa.Column('id', sa.String(length=80), nullable=False),
    sa.Column('project_id', sa.String(length=80), nullable=False),
    sa.Column('display_order', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=240), nullable=False),
    sa.Column('summary', sa.Text(), nullable=False),
    sa.Column('script_source', sa.Text(), nullable=False),
    sa.Column('user_intent', sa.Text(), nullable=False),
    sa.Column('user_prompt', sa.Text(), nullable=False),
    sa.Column('ai_prompt', sa.Text(), nullable=False),
    sa.Column('final_prompt', sa.Text(), nullable=False),
    sa.Column('prompt_source', sa.String(length=16), nullable=False),
    sa.Column('generation_params', sa.JSON(), nullable=False),
    sa.Column('planned_duration_seconds', sa.Float(), nullable=False),
    sa.Column('state', sa.String(length=40), nullable=False),
    sa.Column('progress', sa.Float(), nullable=True),
    sa.Column('primary_result_id', sa.String(length=80), nullable=True),
    sa.Column('revision', sa.Integer(), nullable=False),
    sa.Column('user_view_mode', sa.String(length=16), nullable=False),
    sa.Column('ai_view_mode', sa.String(length=16), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('project_id', 'display_order', name='uq_task_project_order')
    )
    op.create_index(op.f('ix_generation_tasks_project_id'), 'generation_tasks', ['project_id'], unique=False)
    op.create_table('scenes',
    sa.Column('id', sa.String(length=80), nullable=False),
    sa.Column('project_id', sa.String(length=80), nullable=False),
    sa.Column('number', sa.Integer(), nullable=False),
    sa.Column('title', sa.String(length=240), nullable=False),
    sa.Column('summary', sa.Text(), nullable=False),
    sa.Column('order_key', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('project_id', 'order_key', name='uq_scene_project_order')
    )
    op.create_index(op.f('ix_scenes_project_id'), 'scenes', ['project_id'], unique=False)
    op.create_table('ai_prompt_revisions',
    sa.Column('id', sa.String(length=80), nullable=False),
    sa.Column('project_id', sa.String(length=80), nullable=False),
    sa.Column('task_id', sa.String(length=80), nullable=False),
    sa.Column('source_user_prompt', sa.Text(), nullable=False),
    sa.Column('output_prompt', sa.Text(), nullable=False),
    sa.Column('asset_ids', sa.JSON(), nullable=False),
    sa.Column('project_background_used', sa.Boolean(), nullable=False),
    sa.Column('previous_task_summary_used', sa.Boolean(), nullable=False),
    sa.Column('target_skill', sa.String(length=100), nullable=False),
    sa.Column('skill_version', sa.String(length=40), nullable=False),
    sa.Column('provider_profile_id', sa.String(length=100), nullable=True),
    sa.Column('model', sa.String(length=200), nullable=True),
    sa.Column('previous_task_summary_snapshot', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['task_id'], ['generation_tasks.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_prompt_revisions_project_id'), 'ai_prompt_revisions', ['project_id'], unique=False)
    op.create_index(op.f('ix_ai_prompt_revisions_task_id'), 'ai_prompt_revisions', ['task_id'], unique=False)
    op.create_table('generation_context_links',
    sa.Column('id', sa.String(length=80), nullable=False),
    sa.Column('project_id', sa.String(length=80), nullable=False),
    sa.Column('source_task_id', sa.String(length=80), nullable=False),
    sa.Column('target_task_id', sa.String(length=80), nullable=False),
    sa.Column('kind', sa.String(length=40), nullable=False),
    sa.Column('source_result_id', sa.String(length=80), nullable=True),
    sa.Column('stale', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['source_task_id'], ['generation_tasks.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['target_task_id'], ['generation_tasks.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_generation_context_links_project_id'), 'generation_context_links', ['project_id'], unique=False)
    op.create_index(op.f('ix_generation_context_links_source_task_id'), 'generation_context_links', ['source_task_id'], unique=False)
    op.create_index(op.f('ix_generation_context_links_target_task_id'), 'generation_context_links', ['target_task_id'], unique=False)
    op.create_table('jobs',
    sa.Column('id', sa.String(length=80), nullable=False),
    sa.Column('project_id', sa.String(length=80), nullable=False),
    sa.Column('task_id', sa.String(length=80), nullable=False),
    sa.Column('status', sa.String(length=24), nullable=False),
    sa.Column('final_prompt_snapshot', sa.Text(), nullable=False),
    sa.Column('task_content_snapshot', sa.JSON(), nullable=False),
    sa.Column('assets_snapshot', sa.JSON(), nullable=False),
    sa.Column('generation_profile_snapshot', sa.JSON(), nullable=False),
    sa.Column('provider_profile_snapshot', sa.JSON(), nullable=False),
    sa.Column('params_snapshot', sa.JSON(), nullable=False),
    sa.Column('context_snapshot', sa.JSON(), nullable=False),
    sa.Column('seed', sa.Integer(), nullable=True),
    sa.Column('provider_job_id', sa.String(length=200), nullable=True),
    sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('error_code', sa.String(length=100), nullable=True),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['task_id'], ['generation_tasks.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_jobs_project_id'), 'jobs', ['project_id'], unique=False)
    op.create_index(op.f('ix_jobs_task_id'), 'jobs', ['task_id'], unique=False)
    op.create_table('task_asset_bindings',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('task_id', sa.String(length=80), nullable=False),
    sa.Column('asset_id', sa.String(length=80), nullable=False),
    sa.Column('reference', sa.String(length=200), nullable=False),
    sa.Column('role', sa.String(length=240), nullable=True),
    sa.Column('order_index', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['asset_id'], ['assets.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['task_id'], ['generation_tasks.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('task_id', 'asset_id', 'reference', name='uq_task_asset_reference')
    )
    op.create_index(op.f('ix_task_asset_bindings_asset_id'), 'task_asset_bindings', ['asset_id'], unique=False)
    op.create_index(op.f('ix_task_asset_bindings_task_id'), 'task_asset_bindings', ['task_id'], unique=False)
    op.create_table('task_placements',
    sa.Column('task_id', sa.String(length=80), nullable=False),
    sa.Column('scene_id', sa.String(length=80), nullable=False),
    sa.Column('order_key', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['scene_id'], ['scenes.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['task_id'], ['generation_tasks.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('task_id')
    )
    op.create_index(op.f('ix_task_placements_scene_id'), 'task_placements', ['scene_id'], unique=False)
    op.create_table('results',
    sa.Column('id', sa.String(length=80), nullable=False),
    sa.Column('project_id', sa.String(length=80), nullable=False),
    sa.Column('task_id', sa.String(length=80), nullable=False),
    sa.Column('job_id', sa.String(length=80), nullable=False),
    sa.Column('video_url', sa.String(length=1200), nullable=False),
    sa.Column('preview_url', sa.String(length=1200), nullable=True),
    sa.Column('metadata', sa.JSON(), nullable=False),
    sa.Column('review_state', sa.String(length=40), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['job_id'], ['jobs.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['task_id'], ['generation_tasks.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_results_job_id'), 'results', ['job_id'], unique=False)
    op.create_index(op.f('ix_results_project_id'), 'results', ['project_id'], unique=False)
    op.create_index(op.f('ix_results_task_id'), 'results', ['task_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_results_task_id'), table_name='results')
    op.drop_index(op.f('ix_results_project_id'), table_name='results')
    op.drop_index(op.f('ix_results_job_id'), table_name='results')
    op.drop_table('results')
    op.drop_index(op.f('ix_task_placements_scene_id'), table_name='task_placements')
    op.drop_table('task_placements')
    op.drop_index(op.f('ix_task_asset_bindings_task_id'), table_name='task_asset_bindings')
    op.drop_index(op.f('ix_task_asset_bindings_asset_id'), table_name='task_asset_bindings')
    op.drop_table('task_asset_bindings')
    op.drop_index(op.f('ix_jobs_task_id'), table_name='jobs')
    op.drop_index(op.f('ix_jobs_project_id'), table_name='jobs')
    op.drop_table('jobs')
    op.drop_index(op.f('ix_generation_context_links_target_task_id'), table_name='generation_context_links')
    op.drop_index(op.f('ix_generation_context_links_source_task_id'), table_name='generation_context_links')
    op.drop_index(op.f('ix_generation_context_links_project_id'), table_name='generation_context_links')
    op.drop_table('generation_context_links')
    op.drop_index(op.f('ix_ai_prompt_revisions_task_id'), table_name='ai_prompt_revisions')
    op.drop_index(op.f('ix_ai_prompt_revisions_project_id'), table_name='ai_prompt_revisions')
    op.drop_table('ai_prompt_revisions')
    op.drop_index(op.f('ix_scenes_project_id'), table_name='scenes')
    op.drop_table('scenes')
    op.drop_index(op.f('ix_generation_tasks_project_id'), table_name='generation_tasks')
    op.drop_table('generation_tasks')
    op.drop_index(op.f('ix_assets_project_id'), table_name='assets')
    op.drop_table('assets')
    op.drop_table('projects')
