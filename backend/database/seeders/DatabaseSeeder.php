<?php

namespace Database\Seeders;

use App\Models\Menu;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $permissions = [
            'dashboard.view',
            'subjects.view',
            'subjects.create',
            'subjects.update',
            'subjects.delete',
            'chapters.view',
            'chapters.create',
            'chapters.update',
            'chapters.delete',
            'questions.view',
            'questions.create',
            'questions.import',
            'questions.update',
            'questions.delete',
            'users.view',
            'users.create',
            'users.update',
            'users.delete',
            'roles.view',
            'roles.create',
            'roles.update',
            'roles.delete',
            'menus.manage',
            'packages.view',
            'packages.generate',
            'packages.update',
            'packages.export',
            'packages.delete',
        ];

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach ($permissions as $permissionName) {
            Permission::findOrCreate($permissionName, 'web');
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $roles = [
            'super-admin' => $permissions,
            'admin-bank-soal' => $permissions,
            'editor-bank-soal' => [
                'dashboard.view',
                'subjects.view',
                'subjects.create',
                'subjects.update',
                'chapters.view',
                'chapters.create',
                'chapters.update',
                'questions.view',
                'questions.create',
                'questions.import',
                'questions.update',
                'roles.view',
                'packages.view',
                'packages.generate',
                'packages.update',
                'packages.export',
            ],
            'viewer' => [
                'dashboard.view',
                'subjects.view',
                'chapters.view',
                'questions.view',
                'packages.view',
            ],
        ];

        foreach ($roles as $roleName => $rolePermissions) {
            $role = Role::findOrCreate($roleName, 'web');
            $role->syncPermissions($rolePermissions);
        }

        $admin = User::updateOrCreate([
            'email' => 'admin@appsoal.local',
        ], [
            'name' => 'Super Admin',
            'password' => Hash::make('password'),
            'is_active' => true,
        ]);

        $admin->syncRoles(['super-admin']);

        $defaultMenus = [
            ['key' => 'dashboard', 'parent_key' => null, 'label' => 'Ikhtisar', 'icon' => 'FiGrid', 'permission' => 'dashboard.view', 'sort_order' => 10, 'is_active' => true],
            ['key' => 'master-data', 'parent_key' => null, 'label' => 'Master Data', 'icon' => 'FiLayers', 'permission' => null, 'sort_order' => 20, 'is_active' => true],
            ['key' => 'subjects', 'parent_key' => 'master-data', 'label' => 'Subject', 'icon' => 'FiBookmark', 'permission' => 'subjects.view', 'sort_order' => 21, 'is_active' => true],
            ['key' => 'chapters', 'parent_key' => 'master-data', 'label' => 'Bab & Sub Bab', 'icon' => 'FiLayers', 'permission' => 'chapters.view', 'sort_order' => 22, 'is_active' => true],
            ['key' => 'questions', 'parent_key' => null, 'label' => 'Bank Soal', 'icon' => 'FiBookOpen', 'permission' => 'questions.view', 'sort_order' => 30, 'is_active' => true],
            ['key' => 'packages', 'parent_key' => null, 'label' => 'Generator Soal', 'icon' => 'FiFileText', 'permission' => 'packages.view', 'sort_order' => 40, 'is_active' => true],
            ['key' => 'users', 'parent_key' => null, 'label' => 'Hak Akses User', 'icon' => 'FiUsers', 'permission' => 'users.view', 'sort_order' => 50, 'is_active' => true],
            ['key' => 'roles', 'parent_key' => 'users', 'label' => 'Role Permission', 'icon' => 'FiShield', 'permission' => 'roles.view', 'sort_order' => 51, 'is_active' => true],
            ['key' => 'menus', 'parent_key' => 'users', 'label' => 'Manajemen Menu', 'icon' => 'FiMenu', 'permission' => 'menus.manage', 'sort_order' => 52, 'is_active' => true],
        ];

        foreach ($defaultMenus as $menuData) {
            Menu::query()->updateOrCreate(
                ['key' => $menuData['key']],
                [
                    'label' => $menuData['label'],
                    'icon' => $menuData['icon'],
                    'permission' => $menuData['permission'],
                    'sort_order' => $menuData['sort_order'],
                    'is_active' => $menuData['is_active'],
                ]
            );
        }

        $keyToId = Menu::query()->pluck('id', 'key');
        foreach ($defaultMenus as $menuData) {
            Menu::query()
                ->where('key', $menuData['key'])
                ->update([
                    'parent_id' => $menuData['parent_key'] ? $keyToId[$menuData['parent_key']] ?? null : null,
                ]);
        }
    }
}
